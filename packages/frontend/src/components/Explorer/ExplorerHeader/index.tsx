import React, { FC, memo, useEffect } from 'react';
import { useExplorerContext } from '../../../providers/ExplorerProvider';
import { Can } from '../../common/Authorization';
import ShareShortLinkButton from '../../common/ShareShortLinkButton';
import ExploreFromHereButton from '../../ExploreFromHereButton';
import { RefreshButton } from '../../RefreshButton';
import RefreshDbtButton from '../../RefreshDbtButton';
import SaveChartButton from '../SaveChartButton';
import { Spacer, Wrapper } from './ExplorerHeader.styles';

const ExplorerHeader: FC = memo(() => {
    const isEditMode = useExplorerContext(
        (context) => context.state.isEditMode,
    );
    const savedChart = useExplorerContext(
        (context) => context.state.savedChart,
    );
    const isValidQuery = useExplorerContext(
        (context) => context.state.isValidQuery,
    );

    useEffect(() => {
        const hasUnsavedDashboardChanges = JSON.parse(
            sessionStorage.getItem('hasDashboardChanges') ?? 'false',
        );
        const checkReload = (event: BeforeUnloadEvent) => {
            if (hasUnsavedDashboardChanges) {
                const message =
                    'You have unsaved changes to your dashboard! Are you sure you want to leave without saving?';
                event.returnValue = message;
                return message;
            }
        };
        window.addEventListener('beforeunload', checkReload);
        return () => {
            window.removeEventListener('beforeunload', checkReload);
        };
    }, []);

    return (
        <Wrapper>
            {isEditMode ? (
                <>
                    <RefreshDbtButton />
                    <Spacer />
                    <RefreshButton />
                    {!savedChart && (
                        <Can I="manage" a="SavedChart">
                            <SaveChartButton isExplorer />
                        </Can>
                    )}
                </>
            ) : (
                <ExploreFromHereButton />
            )}

            <ShareShortLinkButton disabled={!isValidQuery} />
        </Wrapper>
    );
});

export default ExplorerHeader;
