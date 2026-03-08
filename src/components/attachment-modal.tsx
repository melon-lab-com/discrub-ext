import { useEffect } from "react";
import ModalAlert from "./modal-alert.tsx";
import {
  Typography,
  Button,
  Stack,
  Dialog,
  DialogTitle,
  DialogActions,
  DialogContent,
  Avatar,
  Box,
  useTheme,
  LinearProgress,
  AlertColor,
} from "@mui/material";
import { AppTask } from "../features/app/app-types";
import Attachment from "../classes/attachment";
import { isMessage } from "../app/guards";
import Tooltip from "../common-components/tooltip/tooltip";
import { entityIsImage } from "../utils";
import {
  ATTACHMENT_REQUIRES_ENTIRE_MSG_REMOVAL,
  MISSING_PERMISSION_ATTACHMENT,
} from "../features/message/contants.ts";

type AttachmentModalProps = {
  task: AppTask;
  open: boolean;
  handleClose: () => void;
};

const AttachmentModal = ({
  task,
  open,
  handleClose,
}: AttachmentModalProps) => {
  const theme = useTheme();
  const { entity, active, statusText } = task || {};

  useEffect(() => {
    if (!entity || (isMessage(entity) && entity.attachments.length === 0)) {
      handleClose();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entity]);

  const getAttachment = (attachment: Attachment) => {
    const width = Number(attachment.width);
    const height = Number(attachment.height);
    const maxHeight = 150;
    const maxWidth = 150;
    return (
      <Stack
        direction="row"
        spacing={2}
        alignItems="center"
        justifyContent="space-between"
        sx={{
          backgroundColor: theme.palette.background.paper,
          padding: "10px",
          borderRadius: "5px",
        }}
      >
        <Stack
          direction="row"
          spacing={2}
          alignItems="center"
          justifyContent="center"
        >
          <Avatar
            variant="square"
            sx={{
              cursor: "pointer",
              ...(entityIsImage(attachment)
                ? {
                    width: width < 100 ? width : 100,
                    height: height < 100 ? height : 100,
                    transition: "all ease-in-out .5s",
                    borderRadius: "5px",
                    boxShadow: "4px 5px 6px 0px rgba(0,0,0,0.75)",
                    "&:hover": {
                      width: width > maxWidth ? maxWidth : width,
                      height: height > maxHeight ? maxHeight : height,
                    },
                  }
                : {}),
            }}
            src={attachment.url}
            alt={attachment.filename}
            onClick={() => window.open(attachment.url, "_blank")}
          />
          <Tooltip title={attachment.filename}>
            <Box sx={{ overflow: "hidden", display: "flex" }}>
              <Typography
                sx={{
                  width: "200px",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
                variant="caption"
              >
                {attachment.filename}
              </Typography>
            </Box>
          </Tooltip>
        </Stack>
      </Stack>
    );
  };

  const alertSeverity: AlertColor =
    statusText &&
    [
      ATTACHMENT_REQUIRES_ENTIRE_MSG_REMOVAL,
      MISSING_PERMISSION_ATTACHMENT,
    ].some((msg) => statusText.includes(msg))
      ? "error"
      : "info";

  return (
    <Dialog hideBackdrop fullWidth open={open} onClose={handleClose}>
      <DialogTitle>
        <Typography variant="h5">Attachments</Typography>
      </DialogTitle>
      <DialogContent sx={{ height: "300px", overflow: "hidden !important" }}>
        <Stack
          sx={{ height: "100%", overflow: "auto", padding: "10px" }}
          spacing={1}
        >
          {isMessage(entity) &&
            entity.attachments.map((a) => {
              return getAttachment(a);
            })}
        </Stack>
        <ModalAlert severity={alertSeverity} debugMessage={statusText} />
      </DialogContent>
      <DialogActions sx={{ minHeight: "57px" }}>
        <Stack
          direction="row"
          justifyContent="flex-end"
          alignItems="center"
          spacing={2}
        >
          {active && <LinearProgress sx={{ width: "100%", m: 1 }} />}
          <Button
            disabled={active}
            variant="contained"
            onClick={handleClose}
            color="secondary"
          >
            Close
          </Button>
        </Stack>
      </DialogActions>
    </Dialog>
  );
};
export default AttachmentModal;
