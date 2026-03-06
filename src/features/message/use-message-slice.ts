import { RootState } from "../../app/store";
import {
  setIsLoading as setIsLoadingAction,
  setSearchCriteria as setSearchCriteriaAction,
  setSelected as setSelectedAction,
  setOrder as setOrderAction,
  setMessages as setMessagesAction,
  setFilteredMessages as setFilteredMessagesAction,
  resetFilters as resetFiltersAction,
  resetAdvancedFilters as resetAdvancedFiltersAction,
  updateFilters as updateFiltersAction,
  filterMessages as filterMessagesAction,
  updateMessage as updateMessageAction,
  getMessageData as getMessageDataAction,
  resetMessageData as resetMessageDataAction,
} from "./message-slice";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import {
  Filter,
  MessageSearchOptions,
  SearchCriteria,
} from "./message-types";
import { SortDirection } from "../../enum/sort-direction";
import Message from "../../classes/message";

const useMessageSlice = () => {
  const dispatch = useAppDispatch();

  const useMessages = (): Message[] =>
    useAppSelector((state: RootState) => state.message.messages);

  const useSelectedMessages = (): Snowflake[] =>
    useAppSelector((state: RootState) => state.message.selectedMessages);

  const useFilteredMessages = (): Message[] =>
    useAppSelector((state: RootState) => state.message.filteredMessages);

  const useFilters = (): Filter[] =>
    useAppSelector((state: RootState) => state.message.filters);

  const useIsLoading = (): boolean | Maybe =>
    useAppSelector((state: RootState) => state.message.isLoading);

  const useOrder = (): SortDirection =>
    useAppSelector((state: RootState) => state.message.order);

  const useOrderBy = (): keyof Message | Maybe =>
    useAppSelector((state: RootState) => state.message.orderBy);

  const useSearchCriteria = (): SearchCriteria =>
    useAppSelector((state: RootState) => state.message.searchCriteria);

  const state = {
    messages: useMessages,
    selectedMessages: useSelectedMessages,
    filteredMessages: useFilteredMessages,
    filters: useFilters,
    isLoading: useIsLoading,
    order: useOrder,
    orderBy: useOrderBy,
    searchCriteria: useSearchCriteria,
  };

  const setSearchCriteria = (criteria: Partial<SearchCriteria>): void => {
    dispatch(setSearchCriteriaAction(criteria));
  };

  const setIsLoading = (value: boolean): void => {
    dispatch(setIsLoadingAction(value));
  };

  const setSelected = (messageIds: Snowflake[]) => {
    dispatch(setSelectedAction(messageIds));
  };

  const setOrder = (orderProps: {
    order: SortDirection;
    orderBy: keyof Message;
  }) => {
    dispatch(setOrderAction(orderProps));
  };

  const setMessages = (messages: Message[]) => {
    dispatch(setMessagesAction(messages));
  };

  const setFilteredMessages = (messages: Message[]) => {
    dispatch(setFilteredMessagesAction(messages));
  };

  const resetFilters = () => {
    dispatch(resetFiltersAction());
  };

  const resetAdvancedFilters = () => {
    dispatch(resetAdvancedFiltersAction());
  };

  const updateFilters = (filter: Filter) => {
    dispatch(updateFiltersAction(filter));
  };

  const filterMessages = () => {
    dispatch(filterMessagesAction());
  };

  const updateMessage = (message: Message) => {
    dispatch(updateMessageAction(message));
  };

  const getMessageData = (
    guildId: string | null,
    channelId: string | null,
    options: Partial<MessageSearchOptions> = {},
  ) => {
    return dispatch(getMessageDataAction(guildId, channelId, options));
  };

  const resetMessageData = () => {
    dispatch(resetMessageDataAction());
  };

  return {
    state,
    setIsLoading,
    setSearchCriteria,
    setSelected,
    setOrder,
    setMessages,
    setFilteredMessages,
    resetFilters,
    resetAdvancedFilters,
    updateFilters,
    filterMessages,
    updateMessage,
    getMessageData,
    resetMessageData,
  };
};

export { useMessageSlice };
