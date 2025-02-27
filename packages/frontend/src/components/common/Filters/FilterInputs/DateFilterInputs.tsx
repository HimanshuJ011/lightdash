import { NumericInput } from '@blueprintjs/core';
import { DateInput2 } from '@blueprintjs/datetime2';
import {
    ConditionalRule,
    DateFilterRule,
    DimensionType,
    FilterOperator,
    formatDate,
    isDimension,
    isField,
    isFilterRule,
    isWeekDay,
    parseDate,
    TimeFrames,
} from '@lightdash/common';
import moment from 'moment';
import React from 'react';
import MonthAndYearInput from '../../MonthAndYearInput';
import WeekPicker, { convertWeekDayToDayPickerWeekDay } from '../../WeekPicker';
import YearInput from '../../YearInput';
import { useFiltersContext } from '../FiltersProvider';
import { getPlaceholderByFilterTypeAndOperator } from '../utils/getPlaceholderByFilterTypeAndOperator';
import DefaultFilterInputs, { FilterInputsProps } from './DefaultFilterInputs';
import {
    MultipleInputsWrapper,
    StyledDateRangeInput,
} from './FilterInputs.styles';
import UnitOfTimeAutoComplete from './UnitOfTimeAutoComplete';

const DateFilterInputs = <T extends ConditionalRule = DateFilterRule>(
    props: React.PropsWithChildren<FilterInputsProps<T>>,
) => {
    const { field, rule, onChange, popoverProps, disabled, filterType } = props;
    const { startOfWeek } = useFiltersContext();
    const isTimestamp =
        isField(field) && field.type === DimensionType.TIMESTAMP;

    if (!isFilterRule(rule)) {
        throw new Error('DateFilterInputs expects a FilterRule');
    }

    const placeholder = getPlaceholderByFilterTypeAndOperator({
        type: filterType,
        operator: rule.operator,
        disabled: rule.disabled,
    });

    switch (rule.operator) {
        case FilterOperator.EQUALS:
        case FilterOperator.NOT_EQUALS:
        case FilterOperator.GREATER_THAN:
        case FilterOperator.GREATER_THAN_OR_EQUAL:
        case FilterOperator.LESS_THAN:
        case FilterOperator.LESS_THAN_OR_EQUAL:
            if (isDimension(field) && field.timeInterval) {
                switch (field.timeInterval.toUpperCase()) {
                    case TimeFrames.WEEK:
                        return (
                            <>
                                <span style={{ whiteSpace: 'nowrap' }}>
                                    week commencing
                                </span>
                                <WeekPicker
                                    placeholder={placeholder}
                                    disabled={disabled}
                                    value={rule.values ? rule.values[0] : null}
                                    popoverProps={popoverProps}
                                    startOfWeek={startOfWeek}
                                    onChange={(value: Date | null) => {
                                        onChange({
                                            ...rule,
                                            values:
                                                value === null
                                                    ? undefined
                                                    : [moment(value).toDate()],
                                        });
                                    }}
                                />
                            </>
                        );
                    case TimeFrames.MONTH:
                        return (
                            <MonthAndYearInput
                                disabled={disabled}
                                placeholder={placeholder}
                                // FIXME: remove this once we migrate off of Blueprint
                                // we are doing type conversion here because Blueprint expects DOM element
                                // Mantine does not provide a DOM element on onOpen/onClose
                                popoverProps={{
                                    onOpen: () =>
                                        popoverProps?.onOpened?.(null as any),
                                    onClose: () =>
                                        popoverProps?.onClose?.(null as any),
                                }}
                                value={rule.values ? rule.values[0] : null}
                                onChange={(value: Date) => {
                                    onChange({
                                        ...rule,
                                        values: [
                                            moment(value)
                                                .startOf('month')
                                                .toDate(),
                                        ],
                                    });
                                }}
                            />
                        );
                    case TimeFrames.YEAR:
                        return (
                            <YearInput
                                disabled={disabled}
                                placeholder={placeholder}
                                // FIXME: remove this once we migrate off of Blueprint
                                // we are doing type conversion here because Blueprint expects DOM element
                                // Mantine does not provide a DOM element on onOpen/onClose
                                popoverProps={{
                                    onOpen: () =>
                                        popoverProps?.onOpened?.(null as any),
                                    onClose: () =>
                                        popoverProps?.onClose?.(null as any),
                                }}
                                value={rule.values ? rule.values[0] : null}
                                onChange={(value: Date) => {
                                    onChange({
                                        ...rule,
                                        values: [
                                            moment(value)
                                                .startOf('year')
                                                .toDate(),
                                        ],
                                    });
                                }}
                            />
                        );
                    default:
                        break;
                }
            }

            if (isTimestamp) {
                return (
                    <DateInput2
                        className={disabled ? 'disabled-filter' : ''}
                        placeholder={placeholder}
                        disabled={disabled}
                        fill
                        defaultTimezone="UTC"
                        showTimezoneSelect={false}
                        value={
                            rule.values
                                ? new Date(rule.values[0]).toString()
                                : null
                        }
                        timePrecision={'millisecond'}
                        formatDate={(value: Date) =>
                            moment(value).format(`YYYY-MM-DD, HH:mm:ss:SSS`)
                        }
                        parseDate={(value) =>
                            moment(value, `YYYY-MM-DD, HH:mm:ss:SSS`).toDate()
                        }
                        onChange={(value: string | null) => {
                            onChange({
                                ...rule,
                                values: value === null ? undefined : [value],
                            });
                        }}
                        popoverProps={{
                            placement: 'bottom',
                            ...popoverProps,
                        }}
                        dayPickerProps={{
                            firstDayOfWeek: isWeekDay(startOfWeek)
                                ? convertWeekDayToDayPickerWeekDay(startOfWeek)
                                : undefined,
                        }}
                        maxDate={moment(new Date()).add(7, 'years').toDate()}
                    />
                );
            }

            return (
                <DateInput2
                    className={disabled ? 'disabled-filter' : ''}
                    placeholder={placeholder}
                    disabled={disabled}
                    fill
                    value={
                        rule.values
                            ? formatDate(rule.values?.[0], undefined, false)
                            : null
                    }
                    formatDate={(value: Date) =>
                        formatDate(value, undefined, false)
                    }
                    parseDate={parseDate}
                    onChange={(value: string | null) => {
                        if (value) {
                            onChange({
                                ...rule,
                                values: [formatDate(value, undefined, false)],
                            });
                        }
                    }}
                    popoverProps={{
                        placement: 'bottom',
                        ...popoverProps,
                    }}
                    dayPickerProps={{
                        firstDayOfWeek: isWeekDay(startOfWeek)
                            ? convertWeekDayToDayPickerWeekDay(startOfWeek)
                            : undefined,
                    }}
                    maxDate={moment(new Date()).add(7, 'years').toDate()}
                />
            );
        case FilterOperator.IN_THE_PAST:
        case FilterOperator.NOT_IN_THE_PAST:
        case FilterOperator.IN_THE_NEXT:
            const parsedValue = parseInt(rule.values?.[0], 10);
            return (
                <MultipleInputsWrapper>
                    <NumericInput
                        className={disabled ? 'disabled-filter' : ''}
                        fill
                        placeholder={placeholder}
                        disabled={disabled}
                        value={isNaN(parsedValue) ? undefined : parsedValue}
                        min={0}
                        onValueChange={(value) =>
                            onChange({ ...rule, values: [value] })
                        }
                    />
                    <UnitOfTimeAutoComplete
                        disabled={disabled}
                        isTimestamp={isTimestamp}
                        unitOfTime={rule.settings?.unitOfTime}
                        completed={rule.settings?.completed || false}
                        popoverProps={popoverProps}
                        onChange={(value) =>
                            onChange({
                                ...rule,
                                settings: {
                                    unitOfTime: value.unitOfTime,
                                    completed: value.completed,
                                },
                            })
                        }
                    />
                </MultipleInputsWrapper>
            );
        case FilterOperator.IN_THE_CURRENT:
            return (
                <MultipleInputsWrapper>
                    <UnitOfTimeAutoComplete
                        disabled={disabled}
                        isTimestamp={isTimestamp}
                        unitOfTime={rule.settings?.unitOfTime}
                        showOptionsInPlural={false}
                        showCompletedOptions={false}
                        completed={false}
                        popoverProps={popoverProps}
                        onChange={(value) =>
                            onChange({
                                ...rule,
                                settings: {
                                    unitOfTime: value.unitOfTime,
                                    completed: false,
                                },
                            })
                        }
                    />
                </MultipleInputsWrapper>
            );
        case FilterOperator.IN_BETWEEN:
            if (isTimestamp) {
                return (
                    <MultipleInputsWrapper>
                        <StyledDateRangeInput
                            allowSingleDayRange
                            className={disabled ? 'disabled-filter' : ''}
                            disabled={disabled}
                            formatDate={(value: Date) =>
                                moment(value)
                                    .format(`YYYY-MM-DD, HH:mm:ss:SSS`)
                                    .toString()
                            }
                            parseDate={(value) =>
                                moment(
                                    value,
                                    `YYYY-MM-DD, HH:mm:ss:SSS`,
                                ).toDate()
                            }
                            value={[
                                rule.values?.[0]
                                    ? new Date(rule.values?.[0])
                                    : null,
                                rule.values?.[1]
                                    ? new Date(rule.values?.[1])
                                    : null,
                            ]}
                            timePrecision="millisecond"
                            onChange={(
                                range: [Date | null, Date | null] | null,
                            ) => {
                                if (range && (range[0] || range[1])) {
                                    onChange({
                                        ...rule,
                                        values: [range[0], range[1]],
                                    });
                                }
                            }}
                            popoverProps={{
                                placement: 'bottom',
                                ...popoverProps,
                            }}
                            dayPickerProps={{
                                firstDayOfWeek: isWeekDay(startOfWeek)
                                    ? convertWeekDayToDayPickerWeekDay(
                                          startOfWeek,
                                      )
                                    : undefined,
                            }}
                            closeOnSelection={false}
                            shortcuts={false}
                            maxDate={moment(new Date())
                                .add(7, 'years')
                                .toDate()}
                        />
                    </MultipleInputsWrapper>
                );
            }

            return (
                <MultipleInputsWrapper>
                    <StyledDateRangeInput
                        className={disabled ? 'disabled-filter' : ''}
                        placeholder={placeholder}
                        disabled={disabled}
                        formatDate={(value: Date) =>
                            formatDate(value, undefined, false)
                        }
                        parseDate={parseDate}
                        value={[
                            rule.values?.[0]
                                ? parseDate(
                                      formatDate(
                                          rule.values?.[0],
                                          undefined,
                                          false,
                                      ),
                                      TimeFrames.DAY,
                                  )
                                : null,
                            rule.values?.[1]
                                ? parseDate(
                                      formatDate(
                                          rule.values?.[1],
                                          undefined,
                                          false,
                                      ),
                                      TimeFrames.DAY,
                                  )
                                : null,
                        ]}
                        onChange={(
                            range: [Date | null, Date | null] | null,
                        ) => {
                            if (range && (range[0] || range[1])) {
                                onChange({
                                    ...rule,
                                    values: [
                                        formatDate(
                                            range[0]
                                                ? range[0]
                                                : moment(range[1]).add(
                                                      -1,
                                                      'days',
                                                  ),
                                            undefined,
                                            false,
                                        ),
                                        formatDate(
                                            range[1]
                                                ? range[1]
                                                : moment(range[0]).add(
                                                      1,
                                                      'days',
                                                  ),
                                            undefined,
                                            false,
                                        ),
                                    ],
                                });
                            }
                        }}
                        popoverProps={{
                            placement: 'bottom',
                            ...popoverProps,
                        }}
                        dayPickerProps={{
                            firstDayOfWeek: isWeekDay(startOfWeek)
                                ? convertWeekDayToDayPickerWeekDay(startOfWeek)
                                : undefined,
                        }}
                        closeOnSelection={true}
                        shortcuts={false}
                        maxDate={moment(new Date()).add(7, 'years').toDate()}
                    />
                </MultipleInputsWrapper>
            );
        default: {
            return <DefaultFilterInputs {...props} />;
        }
    }
};

export default DateFilterInputs;
