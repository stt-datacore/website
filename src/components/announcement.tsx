import React from "react";

import { Message, Icon, Button, SemanticCOLORS } from "semantic-ui-react";

import { useStateWithStorage } from "../utils/storage";
import { useNavigate } from "react-router-dom";
import { MarkdownEntry } from "../model/mdpages";
import MarkdownPage from "./mdpage";

const DAYS_TO_EXPIRE = 7;

const Announcement = (props: { announcement: MarkdownEntry }) => {
    const [readyToAnnounce, setReadyToAnnounce] = React.useState<boolean>(false);

    const [dismissAnnouncement, setDismissAnnouncement]
        = useStateWithStorage<Date | undefined>
        (
            "dismissAnnouncement",
            undefined,
            {
                rememberForever: true,
                onInitialize: () => setReadyToAnnounce(true)
            }
        );

    // To avoid rendering and then hiding an announcement that was previously dismissed,
    //	wait for cookie retrieval before rendering the message in the first place
    if (!readyToAnnounce) return <></>;

    return (
        <LastAnnouncement
            announcement={props.announcement}
            dismissAnnouncement={dismissAnnouncement}
            setDismissAnnouncement={setDismissAnnouncement}
        />
    );
};

type LastAnnouncementProps = {
    announcement: MarkdownEntry;
    dismissAnnouncement: Date | undefined;
    setDismissAnnouncement: (dismissDate: Date) => void;
};

const LastAnnouncement = (props: LastAnnouncementProps) => {
    const { dismissAnnouncement, setDismissAnnouncement, announcement } = props;
    const navigate = useNavigate();
    const [dateNow, setDateNow] = React.useState<Date>(new Date());

    const datePosted: Date = new Date(announcement.date! as any);
    if (dismissAnnouncement) {
        const dateDismissed: Date = new Date(dismissAnnouncement);
        if (dateDismissed > datePosted) return <></>;
    }

    const dateExpires: Date = new Date(datePosted);
    dateExpires.setDate(datePosted.getDate() + DAYS_TO_EXPIRE);
    if (dateExpires < dateNow) return <></>;

    const isExcerpt: boolean = true;

    let color: SemanticCOLORS;
    switch (announcement.class) {
        case "info":
            color = "blue";
            break;
        case "warning":
            color = "yellow";
            break;
        case "positive":
            color = "green";
            break;
        case "negative":
            color = "red";
            break;
        default:
            color = "blue";
            break;
    }

    return (
        <Message
            icon
            size="large"
            color={color}
            onDismiss={() => setDismissAnnouncement(new Date())}
        >
            <Icon name={announcement.icon as any ?? "info"} />
            <Message.Content>
                <Message.Header>
                    {announcement.title ?? "Message from the DataCore Team"}
                </Message.Header>
                <MarkdownPage node={announcement} prefix={'announcements'} excerpt={true} />
                {isExcerpt && (
                    <div style={{ marginTop: "1em" }}>
                        <Button
                            color={color}
                            content="See details..."
                            onClick={() => navigate("/announcements/")}
                        />
                    </div>
                )}
            </Message.Content>
        </Message>
    );
};

export default Announcement;
