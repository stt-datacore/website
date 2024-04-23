import React from "react";
import { graphql, useStaticQuery, navigate } from "gatsby";
import { Message, Icon, Button, SemanticCOLORS } from "semantic-ui-react";

import { useStateWithStorage } from "../utils/storage";

const DAYS_TO_EXPIRE = 7;

const Announcement = () => {
  const [readyToAnnounce, setReadyToAnnounce] = React.useState<boolean>(false);
  const [dismissAnnouncement, setDismissAnnouncement] = useStateWithStorage<
    Date | undefined
  >("dismissAnnouncement", undefined, {
    rememberForever: true,
    onInitialize: () => setReadyToAnnounce(true),
  });

  // To avoid rendering and then hiding an announcement that was previously dismissed,
  //	wait for cookie retrieval before rendering the message in the first place
  if (!readyToAnnounce) return <></>;

  return (
    <LastAnnouncement
      dismissAnnouncement={dismissAnnouncement}
      setDismissAnnouncement={setDismissAnnouncement}
    />
  );
};

type LastAnnouncementProps = {
  dismissAnnouncement: Date | undefined;
  setDismissAnnouncement: (dismissDate: Date) => void;
};

const LastAnnouncement = (props: LastAnnouncementProps) => {
  const { dismissAnnouncement, setDismissAnnouncement } = props;

  const [dateNow, setDateNow] = React.useState<Date>(new Date());

  const data = useStaticQuery(graphql`
    query AnnouncementQuery {
      allMarkdownRemark(
        limit: 1
        sort: { frontmatter: { date: DESC } }
        filter: { fields: { source: { eq: "announcements" } } }
      ) {
        edges {
          node {
            html
            frontmatter {
              title
              class
              icon
              date
            }
            excerpt(format: HTML)
          }
        }
      }
    }
  `);

  const announcements = data.allMarkdownRemark.edges;
  if (announcements.length === 0) return <></>;

  const announcement = announcements[0].node;
  const datePosted: Date = new Date(announcement.frontmatter.date);
  if (dismissAnnouncement) {
    const dateDismissed: Date = new Date(dismissAnnouncement);
    if (dateDismissed > datePosted) return <></>;
  }

  const dateExpires: Date = new Date(datePosted);
  dateExpires.setDate(datePosted.getDate() + DAYS_TO_EXPIRE);
  if (dateExpires < dateNow) return <></>;

  const isExcerpt: boolean = announcement.html !== announcement.excerpt;

  let color: SemanticCOLORS;
  switch (announcement.frontmatter.class) {
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
      <Icon name={announcement.frontmatter.icon ?? "info"} />
      <Message.Content>
        <Message.Header>
          {announcement.frontmatter.title ?? "Message from the DataCore Team"}
        </Message.Header>
        <div dangerouslySetInnerHTML={{ __html: announcement.excerpt }} />
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
