import { useMemo, useState } from "react";
import { alpha } from "@mui/material/styles";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import FilterListIcon from "@mui/icons-material/FilterList";
import debounce from "debounce";
import FilterListOffIcon from "@mui/icons-material/FilterListOff";
import DownloadIcon from "@mui/icons-material/Download";
import { Button } from "@mui/material";
import Message from "../../classes/message";
import { useDmSlice } from "../../features/dm/use-dm-slice";
import { useAppSlice } from "../../features/app/use-app-slice";
import { useMessageSlice } from "../../features/message/use-message-slice";
import { Filter } from "../../features/message/message-types";
import { useThreadSlice } from "../../features/thread/use-thread-slice";
import ExportButton from "../export-button/export-button";
import FilterModal from "./components/filter-modal";

const formatMessagesToText = (messages: Message[]): string =>
  messages
    .map((m) => {
      const date = new Date(m.timestamp).toLocaleString();
      const username = m.userName ?? m.author.username;
      const content = m.content.replace(/\r?\n/g, " ");
      return `[${date}] ${username}: ${content}`;
    })
    .join("\n");

const downloadAsTxt = (content: string, filename: string): void => {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
};

type MessageTableToolbarProps = {
  selectedRows: string[];
};

const MessageTableToolbar = ({ selectedRows }: MessageTableToolbarProps) => {
  const { state: dmState } = useDmSlice();
  const selectedDms = dmState.selectedDms();
  const isDm = !!selectedDms.length;

  const { state: appState } = useAppSlice();
  const discrubCancelled = appState.discrubCancelled();

  const {
    state: messageState,
    resetFilters,
    updateFilters,
    filterMessages,
  } = useMessageSlice();
  const messages = messageState.messages();
  const filteredMessages = messageState.filteredMessages();
  const filters = messageState.filters();

  const { state: threadState } = useThreadSlice();
  const threads = threadState.threads();

  const [filterOpen, setFilterOpen] = useState(false);
  const [isFiltering, setIsFiltering] = useState(false);

  const handleFilterToggle = () => {
    setFilterOpen(!filterOpen);
  };

  const handleFilterMessages = useMemo(
    () =>
      debounce(async () => {
        try {
          await filterMessages();
        } finally {
          setIsFiltering(false);
        }
      }, 600),
    [filterMessages],
  );

  const handleFilterUpdate = (filter: Filter) => {
    setIsFiltering(true);
    updateFilters(filter);
    handleFilterMessages();
  };

  const handleQuickExportTxt = () => {
    const visibleMessages = filters.length ? filteredMessages : messages;
    const text = formatMessagesToText(visibleMessages);
    downloadAsTxt(text, `messages-${Date.now()}.txt`);
  };

  const zeroSelections = selectedRows.length === 0;

  return (
    <Toolbar
      sx={{
        pl: { sm: 2 },
        pr: { xs: 1, sm: 1 },
        ...(selectedRows.length > 0 && {
          bgcolor: (theme) =>
            alpha(
              theme.palette.primary.main,
              theme.palette.action.activatedOpacity,
            ),
        }),
      }}
    >
      <Stack sx={{ width: "100%" }} direction="column">
        <Stack
          sx={{ width: "100%" }}
          alignItems="baseline"
          direction="column"
          spacing={2}
          mb="10px"
        >
          <Stack
            sx={{ width: "100%" }}
            mt="20px !important"
            direction="row"
            justifyContent="space-between"
            zIndex={2}
          >
            <Button
              variant="contained"
              color={filters.length ? "primary" : "secondary"}
              startIcon={
                filters.length ? <FilterListIcon /> : <FilterListOffIcon />
              }
              onClick={handleFilterToggle}
            >
              {`Quick Filtering${filters.length ? " (Active)" : ""}`}
            </Button>
            <Stack direction="row" spacing={1} alignItems="center">
              <Button
                variant="outlined"
                startIcon={<DownloadIcon />}
                disabled={
                  discrubCancelled ||
                  isFiltering ||
                  (filters.length > 0
                    ? filteredMessages.length === 0
                    : messages.length === 0)
                }
                onClick={handleQuickExportTxt}
              >
                Quick Export TXT
              </Button>
              <ExportButton
                disabled={discrubCancelled || isFiltering}
                bulk={false}
                isDm={isDm}
              />
            </Stack>
          </Stack>
          <FilterModal
            open={filterOpen}
            handleModalToggle={handleFilterToggle}
            isDm={isDm}
            handleFilterUpdate={handleFilterUpdate}
            threads={threads}
            handleResetFilters={resetFilters}
            filters={filters}
          />
        </Stack>

        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          sx={{ minHeight: "40px" }}
        >
          <Typography variant="subtitle1" component="div">
            {zeroSelections ? "No" : selectedRows.length} Message
            {zeroSelections || selectedRows.length > 1 ? "s" : ""} Selected
          </Typography>
        </Stack>
      </Stack>
    </Toolbar>
  );
};

export default MessageTableToolbar;
