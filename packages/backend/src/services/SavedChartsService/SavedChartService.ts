import { subject } from '@casl/ability';
import {
    assertUnreachable,
    ChartSummary,
    ChartType,
    countTotalFilterRules,
    CreateSavedChart,
    CreateSavedChartVersion,
    CreateSchedulerAndTargetsWithoutIds,
    ForbiddenError,
    isChartScheduler,
    isConditionalFormattingConfigWithColorRange,
    isConditionalFormattingConfigWithSingleColor,
    isSlackTarget,
    isUserWithOrg,
    SavedChart,
    SchedulerAndTargets,
    SessionUser,
    UpdatedByUser,
    UpdateMultipleSavedChart,
    UpdateSavedChart,
    ViewStatistics,
} from '@lightdash/common';
import cronstrue from 'cronstrue';
import { analytics } from '../../analytics/client';
import {
    ConditionalFormattingRuleSavedEvent,
    CreateSavedChartVersionEvent,
} from '../../analytics/LightdashAnalytics';
import { schedulerClient, slackClient } from '../../clients/clients';
import { AnalyticsModel } from '../../models/AnalyticsModel';
import { PinnedListModel } from '../../models/PinnedListModel';
import { ProjectModel } from '../../models/ProjectModel/ProjectModel';
import { SavedChartModel } from '../../models/SavedChartModel';
import { SchedulerModel } from '../../models/SchedulerModel';
import { SpaceModel } from '../../models/SpaceModel';
import { hasSpaceAccess } from '../SpaceService/SpaceService';

type Dependencies = {
    projectModel: ProjectModel;
    savedChartModel: SavedChartModel;
    spaceModel: SpaceModel;
    analyticsModel: AnalyticsModel;
    pinnedListModel: PinnedListModel;
    schedulerModel: SchedulerModel;
};

export class SavedChartService {
    private readonly projectModel: ProjectModel;

    private readonly savedChartModel: SavedChartModel;

    private readonly spaceModel: SpaceModel;

    private readonly analyticsModel: AnalyticsModel;

    private readonly pinnedListModel: PinnedListModel;

    private readonly schedulerModel: SchedulerModel;

    constructor(dependencies: Dependencies) {
        this.projectModel = dependencies.projectModel;
        this.savedChartModel = dependencies.savedChartModel;
        this.spaceModel = dependencies.spaceModel;
        this.analyticsModel = dependencies.analyticsModel;
        this.pinnedListModel = dependencies.pinnedListModel;
        this.schedulerModel = dependencies.schedulerModel;
    }

    private async checkUpdateAccess(
        user: SessionUser,
        chartUuid: string,
    ): Promise<ChartSummary> {
        const savedChart = await this.savedChartModel.getSummary(chartUuid);
        const { organizationUuid, projectUuid } = savedChart;
        if (
            user.ability.cannot(
                'update',
                subject('SavedChart', { organizationUuid, projectUuid }),
            )
        ) {
            throw new ForbiddenError();
        }
        if (!(await this.hasChartSpaceAccess(user, savedChart.spaceUuid))) {
            throw new ForbiddenError(
                "You don't have access to the space this chart belongs to",
            );
        }
        return savedChart;
    }

    async hasChartSpaceAccess(
        user: SessionUser,
        spaceUuid: string,
    ): Promise<boolean> {
        try {
            const space = await this.spaceModel.getSpaceSummary(spaceUuid);
            return hasSpaceAccess(user, space);
        } catch (e) {
            return false;
        }
    }

    static getCreateEventProperties(
        savedChart: SavedChart,
    ): CreateSavedChartVersionEvent['properties'] {
        const echartsConfig =
            savedChart.chartConfig.type === ChartType.CARTESIAN
                ? savedChart.chartConfig.config.eChartsConfig
                : undefined;
        const tableConfig =
            savedChart.chartConfig.type === ChartType.TABLE
                ? savedChart.chartConfig.config
                : undefined;

        return {
            projectId: savedChart.projectUuid,
            savedQueryId: savedChart.uuid,
            dimensionsCount: savedChart.metricQuery.dimensions.length,
            metricsCount: savedChart.metricQuery.metrics.length,
            filtersCount: countTotalFilterRules(savedChart.metricQuery.filters),
            sortsCount: savedChart.metricQuery.sorts.length,
            tableCalculationsCount:
                savedChart.metricQuery.tableCalculations.length,
            pivotCount: (savedChart.pivotConfig?.columns || []).length,
            chartType: savedChart.chartConfig.type,
            pie:
                savedChart.chartConfig.type === ChartType.PIE
                    ? {
                          isDonut:
                              savedChart.chartConfig?.config?.isDonut ?? false,
                      }
                    : undefined,
            table:
                savedChart.chartConfig.type === ChartType.TABLE
                    ? {
                          conditionalFormattingRulesCount:
                              tableConfig?.conditionalFormattings?.length || 0,
                          hasMetricsAsRows: !!tableConfig?.metricsAsRows,
                          hasRowCalculation: !!tableConfig?.showRowCalculation,
                          hasColumnCalculations:
                              !!tableConfig?.showColumnCalculation,
                      }
                    : undefined,

            bigValue:
                savedChart.chartConfig.type === ChartType.BIG_NUMBER
                    ? {
                          hasBigValueComparison:
                              savedChart.chartConfig.config?.showComparison,
                      }
                    : undefined,
            cartesian:
                savedChart.chartConfig.type === ChartType.CARTESIAN
                    ? {
                          xAxisCount: (
                              savedChart.chartConfig.config.eChartsConfig
                                  .xAxis || []
                          ).length,
                          yAxisCount: (
                              savedChart.chartConfig.config.eChartsConfig
                                  .yAxis || []
                          ).length,
                          seriesTypes: (
                              savedChart.chartConfig.config.eChartsConfig
                                  .series || []
                          ).map(({ type }) => type),
                          seriesCount: (
                              savedChart.chartConfig.config.eChartsConfig
                                  .series || []
                          ).length,
                          referenceLinesCount:
                              echartsConfig?.series?.filter(
                                  (serie) => serie.markLine?.data !== undefined,
                              ).length || 0,
                          margins:
                              echartsConfig?.grid?.top === undefined
                                  ? 'default'
                                  : 'custom',
                          showLegend: echartsConfig?.legend?.show !== false,
                      }
                    : undefined,
        };
    }

    static getConditionalFormattingEventProperties(
        savedChart: SavedChart,
    ): ConditionalFormattingRuleSavedEvent['properties'][] | undefined {
        if (
            savedChart.chartConfig.type !== ChartType.TABLE ||
            !savedChart.chartConfig.config?.conditionalFormattings ||
            savedChart.chartConfig.config.conditionalFormattings.length === 0
        ) {
            return undefined;
        }

        const eventProperties =
            savedChart.chartConfig.config.conditionalFormattings.map((rule) => {
                let type: 'color range' | 'single color';
                let numConditions: number;

                if (isConditionalFormattingConfigWithColorRange(rule)) {
                    type = 'color range';
                    numConditions = 1;
                } else if (isConditionalFormattingConfigWithSingleColor(rule)) {
                    type = 'single color';
                    numConditions = rule.rules.length;
                } else {
                    type = assertUnreachable(
                        rule,
                        'Unknown conditional formatting',
                    );
                    numConditions = 0;
                }

                return {
                    projectId: savedChart.projectUuid,
                    organizationId: savedChart.organizationUuid,
                    savedQueryId: savedChart.uuid,
                    type,
                    numConditions,
                };
            });

        return eventProperties;
    }

    async createVersion(
        user: SessionUser,
        savedChartUuid: string,
        data: CreateSavedChartVersion,
    ): Promise<SavedChart> {
        const { organizationUuid, projectUuid, spaceUuid } =
            await this.savedChartModel.getSummary(savedChartUuid);

        if (
            user.ability.cannot(
                'update',
                subject('SavedChart', { organizationUuid, projectUuid }),
            )
        ) {
            throw new ForbiddenError();
        }

        if (!(await this.hasChartSpaceAccess(user, spaceUuid))) {
            throw new ForbiddenError(
                "You don't have access to the space this chart belongs to",
            );
        }
        const savedChart = await this.savedChartModel.createVersion(
            savedChartUuid,
            data,
            user,
        );

        analytics.track({
            event: 'saved_chart_version.created',
            userId: user.userUuid,
            properties: SavedChartService.getCreateEventProperties(savedChart),
        });

        SavedChartService.getConditionalFormattingEventProperties(
            savedChart,
        )?.forEach((properties) => {
            analytics.track({
                event: 'conditional_formatting_rule.saved',
                userId: user.userUuid,
                properties,
            });
        });

        return savedChart;
    }

    async update(
        user: SessionUser,
        savedChartUuid: string,
        data: UpdateSavedChart,
    ): Promise<SavedChart> {
        const { organizationUuid, projectUuid, spaceUuid, dashboardUuid } =
            await this.savedChartModel.getSummary(savedChartUuid);

        if (
            user.ability.cannot(
                'update',
                subject('SavedChart', { organizationUuid, projectUuid }),
            )
        ) {
            throw new ForbiddenError();
        }

        if (!(await this.hasChartSpaceAccess(user, spaceUuid))) {
            throw new ForbiddenError(
                "You don't have access to the space this chart belongs to",
            );
        }
        const savedChart = await this.savedChartModel.update(
            savedChartUuid,
            data,
        );
        analytics.track({
            event: 'saved_chart.updated',
            userId: user.userUuid,
            properties: {
                projectId: savedChart.projectUuid,
                savedQueryId: savedChartUuid,
                dashboardId: savedChart.dashboardUuid ?? undefined,
            },
        });
        if (dashboardUuid && !savedChart.dashboardUuid) {
            analytics.track({
                event: 'dashboard_chart.moved',
                userId: user.userUuid,
                properties: {
                    projectId: savedChart.projectUuid,
                    savedQueryId: savedChartUuid,
                    dashboardId: dashboardUuid,
                    spaceId: savedChart.spaceUuid,
                },
            });
        }
        return savedChart;
    }

    async togglePinning(
        user: SessionUser,
        savedChartUuid: string,
    ): Promise<SavedChart> {
        const { organizationUuid, projectUuid, pinnedListUuid, spaceUuid } =
            await this.savedChartModel.getSummary(savedChartUuid);

        if (
            user.ability.cannot(
                'manage',
                subject('PinnedItems', { organizationUuid, projectUuid }),
            )
        ) {
            throw new ForbiddenError();
        }

        if (!(await this.hasChartSpaceAccess(user, spaceUuid))) {
            throw new ForbiddenError();
        }

        if (pinnedListUuid) {
            await this.pinnedListModel.deleteItem({
                pinnedListUuid,
                savedChartUuid,
            });
        } else {
            await this.pinnedListModel.addItem({
                projectUuid,
                savedChartUuid,
            });
        }
        const pinnedList = await this.pinnedListModel.getPinnedListAndItems(
            projectUuid,
        );

        analytics.track({
            event: 'pinned_list.updated',
            userId: user.userUuid,
            properties: {
                projectId: projectUuid,
                organizationId: organizationUuid,
                location: 'homepage',
                pinnedListId: pinnedList.pinnedListUuid,
                pinnedItems: pinnedList.items,
            },
        });

        return this.get(savedChartUuid, user);
    }

    async updateMultiple(
        user: SessionUser,
        projectUuid: string,
        data: UpdateMultipleSavedChart[],
    ): Promise<SavedChart[]> {
        const project = await this.projectModel.get(projectUuid);

        if (
            user.ability.cannot(
                'update',
                subject('SavedChart', {
                    organizationUuid: project.organizationUuid,
                    projectUuid,
                }),
            )
        ) {
            throw new ForbiddenError();
        }

        const spaceAccessPromises = data.map(async (chart) =>
            this.hasChartSpaceAccess(user, chart.spaceUuid),
        );

        const hasAllAccess = await Promise.all(spaceAccessPromises);
        if (hasAllAccess.includes(false)) {
            throw new ForbiddenError();
        }

        const savedCharts = await this.savedChartModel.updateMultiple(data);
        analytics.track({
            event: 'saved_chart.updated_multiple',
            userId: user.userUuid,
            properties: {
                savedChartIds: data.map((chart) => chart.uuid),
                projectId: projectUuid,
            },
        });
        return savedCharts;
    }

    async delete(user: SessionUser, savedChartUuid: string): Promise<void> {
        const { organizationUuid, projectUuid, spaceUuid } =
            await this.savedChartModel.getSummary(savedChartUuid);

        if (
            user.ability.cannot(
                'delete',
                subject('SavedChart', { organizationUuid, projectUuid }),
            )
        ) {
            throw new ForbiddenError();
        }
        if (!(await this.hasChartSpaceAccess(user, spaceUuid))) {
            throw new ForbiddenError(
                "You don't have access to the space this chart belongs to",
            );
        }

        const deletedChart = await this.savedChartModel.delete(savedChartUuid);
        analytics.track({
            event: 'saved_chart.deleted',
            userId: user.userUuid,
            properties: {
                savedQueryId: deletedChart.uuid,
                projectId: deletedChart.projectUuid,
            },
        });
    }

    async getViewStats(
        user: SessionUser,
        savedChartUuid: string,
    ): Promise<ViewStatistics> {
        const savedChart = await this.savedChartModel.getSummary(
            savedChartUuid,
        );
        if (user.ability.cannot('view', subject('SavedChart', savedChart))) {
            throw new ForbiddenError();
        }
        if (!(await this.hasChartSpaceAccess(user, savedChart.spaceUuid))) {
            throw new ForbiddenError(
                "You don't have access to the space this chart belongs to",
            );
        }
        return this.analyticsModel.getChartViewStats(savedChartUuid);
    }

    async get(savedChartUuid: string, user: SessionUser): Promise<SavedChart> {
        const savedChart = await this.savedChartModel.get(savedChartUuid);
        if (user.ability.cannot('view', subject('SavedChart', savedChart))) {
            throw new ForbiddenError();
        }

        if (!(await this.hasChartSpaceAccess(user, savedChart.spaceUuid))) {
            throw new ForbiddenError(
                "You don't have access to the space this chart belongs to",
            );
        }

        await this.analyticsModel.addChartViewEvent(
            savedChartUuid,
            user.userUuid,
        );

        analytics.track({
            event: 'saved_chart.view',
            userId: user.userUuid,
            properties: {
                savedChartId: savedChart.uuid,
                organizationId: savedChart.organizationUuid,
                projectId: savedChart.projectUuid,
            },
        });

        return savedChart;
    }

    async create(
        user: SessionUser,
        projectUuid: string,
        savedChart: CreateSavedChart,
    ): Promise<SavedChart> {
        const { organizationUuid } = await this.projectModel.get(projectUuid);
        if (
            user.ability.cannot(
                'create',
                subject('SavedChart', { organizationUuid, projectUuid }),
            )
        ) {
            throw new ForbiddenError();
        }
        if (savedChart.spaceUuid) {
            const space = await this.spaceModel.getSpaceSummary(
                savedChart.spaceUuid,
            );
            if (!hasSpaceAccess(user, space)) {
                throw new ForbiddenError();
            }
        }

        const newSavedChart = await this.savedChartModel.create(
            projectUuid,
            user.userUuid,
            {
                ...savedChart,
                updatedByUser: user,
            },
        );
        analytics.track({
            event: 'saved_chart.created',
            userId: user.userUuid,
            properties: {
                ...SavedChartService.getCreateEventProperties(newSavedChart),
                dashboardId: newSavedChart.dashboardUuid ?? undefined,
            },
        });

        SavedChartService.getConditionalFormattingEventProperties(
            newSavedChart,
        )?.forEach((properties) => {
            analytics.track({
                event: 'conditional_formatting_rule.saved',
                userId: user.userUuid,
                properties,
            });
        });

        return newSavedChart;
    }

    async duplicate(
        user: SessionUser,
        projectUuid: string,
        chartUuid: string,
    ): Promise<SavedChart> {
        const chart = await this.savedChartModel.get(chartUuid);
        if (user.ability.cannot('create', subject('SavedChart', chart))) {
            throw new ForbiddenError();
        }
        if (!(await this.hasChartSpaceAccess(user, chart.spaceUuid))) {
            throw new ForbiddenError(
                "You don't have access to the space this chart belongs to",
            );
        }
        let duplicatedChart: CreateSavedChart & {
            updatedByUser: UpdatedByUser;
        };
        const base = {
            ...chart,
            name: `Copy of ${chart.name}`,
            updatedByUser: user,
        };
        if (chart.dashboardUuid) {
            duplicatedChart = {
                ...base,
                dashboardUuid: chart.dashboardUuid,
                spaceUuid: null,
            };
        } else {
            duplicatedChart = {
                ...base,
                dashboardUuid: null,
            };
        }

        const newSavedChart = await this.savedChartModel.create(
            projectUuid,
            user.userUuid,
            duplicatedChart,
        );
        const newSavedChartProperties =
            SavedChartService.getCreateEventProperties(newSavedChart);

        analytics.track({
            event: 'saved_chart.created',
            userId: user.userUuid,
            properties: {
                ...newSavedChartProperties,
                duplicated: true,
                dashboardId: newSavedChart.dashboardUuid ?? undefined,
            },
        });

        analytics.track({
            event: 'duplicated_chart_created',
            userId: user.userUuid,
            properties: {
                ...newSavedChartProperties,
                newSavedQueryId: newSavedChartProperties.savedQueryId,
                duplicateOfSavedQueryId: chartUuid,
            },
        });
        return newSavedChart;
    }

    async getSchedulers(
        user: SessionUser,
        chartUuid: string,
    ): Promise<SchedulerAndTargets[]> {
        await this.checkUpdateAccess(user, chartUuid);
        return this.schedulerModel.getChartSchedulers(chartUuid);
    }

    async createScheduler(
        user: SessionUser,
        chartUuid: string,
        newScheduler: CreateSchedulerAndTargetsWithoutIds,
    ): Promise<SchedulerAndTargets> {
        if (!isUserWithOrg(user)) {
            throw new ForbiddenError('User is not part of an organization');
        }
        const { projectUuid, organizationUuid } = await this.checkUpdateAccess(
            user,
            chartUuid,
        );
        const scheduler = await this.schedulerModel.createScheduler({
            ...newScheduler,
            createdBy: user.userUuid,
            dashboardUuid: null,
            savedChartUuid: chartUuid,
        });
        analytics.track({
            userId: user.userUuid,
            event: 'scheduler.created',
            properties: {
                projectId: projectUuid,
                organizationId: organizationUuid,
                schedulerId: scheduler.schedulerUuid,
                resourceType: isChartScheduler(scheduler)
                    ? 'chart'
                    : 'dashboard',
                cronExpression: scheduler.cron,
                format: scheduler.format,
                cronString: cronstrue.toString(scheduler.cron, {
                    verbose: true,
                    throwExceptionOnParseError: false,
                }),
                resourceId: isChartScheduler(scheduler)
                    ? scheduler.savedChartUuid
                    : scheduler.dashboardUuid,
                targets: scheduler.targets.map((target) =>
                    isSlackTarget(target)
                        ? {
                              schedulerTargetId:
                                  target.schedulerSlackTargetUuid,
                              type: 'slack',
                          }
                        : {
                              schedulerTargetId:
                                  target.schedulerEmailTargetUuid,
                              type: 'email',
                          },
                ),
            },
        });

        await slackClient.joinChannels(
            user.organizationUuid,
            SchedulerModel.getSlackChannels(scheduler.targets),
        );

        await schedulerClient.generateDailyJobsForScheduler(scheduler);

        return scheduler;
    }
}
