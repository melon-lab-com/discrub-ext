import { useState } from "react";
import { alpha } from "@mui/material/styles";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import Tooltip from "../../common-components/tooltip/tooltip";
import Stack from "@mui/material/Stack";
import DeleteIcon from "@mui/icons-material/Delete";
import FilterListIcon from "@mui/icons-material/FilterList";
import debounce from "debounce";
import FilterListOffIcon from "@mui/icons-material/FilterListOff";
import EditIcon from "@mui/icons-material/Edit";
import DownloadIcon from "@mui/icons-material/Download";
import { Button } from "@mui/material";
import Message from "../../classes/message";
import { useDmSlice } from "../../features/dm/use-dm-slice";
import { useAppSlice } from "../../features/app/use-app-slice";
import { useMessageSlice } from "../../features/message/use-message-slice";
import DeleteModal from "./components/delete-modal";
import {
  DeleteConfiguration,
  Filter,
} from "../../features/message/message-types";
import EditModal from "./components/edit-modal";
import { useThreadSlice } from "../../features/thread/use-thread-slice";
import ExportButton from "../export-button/export-button";
import FilterModal from "./components/filter-modal";
import { useExportSlice } from "../../features/export/use-export-slice.ts";

const formatMessagesToText = (messages: Message[]): string =>
  messages
    .map((m) => {
      const date = new Date(m.timestamp).toLocaleString();
      const username = m.userName ?? m.author.username;
      return `[${date}] ${username}: ${m.content}`;
    })
    .join("\n");

const downloadAsTxt = (content: string, filename: string): void => {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
};

type MessageTableToolbarProps = {
  selectedRows: string[];
};

const MessageTableToolbar = ({ selectedRows }: MessageTableToolbarProps) => {
  const { state: dmState } = useDmSlice();
  const selectedDms = dmState.selectedDms();
  const isDm = !!selectedDms.length;

  const {
    state: appState,
    setDiscrubCancelled,
    setDiscrubPaused,
  } = useAppSlice();
  const discrubCancelled = appState.discrubCancelled();
  const task = appState.task();

  const { state: exportState } = useExportSlice();
  const reactionMap = exportState.reactionMap();
  const userMap = exportState.userMap();

  const {
    state: messageState,
    resetFilters,
    deleteMessages,
    editMessages,
    updateFilters,
    filterMessages,
  } = useMessageSlice();
  const messages = messageState.messages();
  const filteredMessages = messageState.filteredMessages();
  const filters = messageState.filters();

  const { state: threadState } = useThreadSlice();
  const threads = threadState.threads();

  const [filterOpen, setFilterOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);

  const handleFilterToggle = () => {
    setFilterOpen(!filterOpen);
  };

  const handleDeleteModalClose = () => {
    if (task.active) {
      // We are actively deleting, we need to send a cancel request
      setDiscrubCancelled(true);
    }

    setDiscrubPaused(false);
    setDeleteModalOpen(false);
  };

  const handleDeleteMessage = (deleteConfig: DeleteConfiguration) => {
    const selections = messages.filter((x) => selectedRows.includes(x.id));
    deleteMessages(selections, deleteConfig);
  };

  const handleEditMessage = (updateText: string) => {
    const toEdit = messages.filter((m) =>
      selectedRows.some((smId) => smId === m.id),
    );
    editMessages(toEdit, updateText);
  };

  const handleEditModalClose = () => {
    if (task.active) {
      // We are actively editing, we need to send a cancel request
      setDiscrubCancelled(true);
    }
    setDiscrubPaused(false);
    setEditModalOpen(false);
  };

  const handleFilterMessages = debounce(() => {
    filterMessages();
  }, 600);

  const handleFilterUpdate = (filter: Filter) => {
    updateFilters(filter);
    handleFilterMessages();
  };

  const handleQuickExportTxt = () => {
    const visibleMessages = filters.length ? filteredMessages : messages;
    const text = formatMessagesToText(visibleMessages);
    downloadAsTxt(text, "messages.txt");
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
      <DeleteModal
        messages={messages}
        reactionMap={reactionMap}
        userMap={userMap}
        selectedRows={selectedRows}
        open={deleteModalOpen}
        handleClose={handleDeleteModalClose}
        task={task}
        handleDeleteMessage={handleDeleteMessage}
      />
      <EditModal
        task={task}
        handleClose={handleEditModalClose}
        handleEditMessage={handleEditMessage}
        open={editModalOpen}
      />
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
            zIndex={2} // This ensures that the Export options show over FilterComponent
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
                disabled={discrubCancelled || messages.length === 0}
                onClick={handleQuickExportTxt}
              >
                Quick Export TXT
              </Button>
              <ExportButton
                disabled={discrubCancelled}
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

          <Stack justifyContent="flex-end" direction="row">
            <Tooltip
              title="Delete"
              description="Delete data from every selected message."
              secondaryDescription="Text, attachments, or reactions."
            >
              <IconButton
                disabled={discrubCancelled || zeroSelections}
                onClick={() => setDeleteModalOpen(true)}
              >
                <DeleteIcon />
              </IconButton>
            </Tooltip>
            <Tooltip
              title="Edit"
              description="Modify the text content of every selected message."
            >
              <IconButton
                disabled={discrubCancelled || zeroSelections}
                onClick={() => setEditModalOpen(true)}
              >
                <EditIcon />
              </IconButton>
            </Tooltip>
          </Stack>
        </Stack>
      </Stack>
    </Toolbar>
  );
};

export default MessageTableToolbar;
