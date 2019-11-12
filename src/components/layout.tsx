import React, { PureComponent } from "react";
import { Message } from "semantic-ui-react";
import TopMenu from "./topmenu";

class Layout extends PureComponent {
  render() {
    let redirectMessage = window.location.hostname.indexOf("netlify") > 0;
    return (
      <React.StrictMode>
        <div>
          <TopMenu />
          {redirectMessage && (
            <Message warning style={{ marginTop: "3.5em" }}>
              <Message.Header>New website address!</Message.Header>
              <p>
                DataCore moved to a new home at{" "}
                <a href="https://datacore.app">datacore.app</a>. Please update
                your bookmarks, the old site will be shut down by the end of
                November 2019.
              </p>
            </Message>
          )}
          {this.props.children}
        </div>
      </React.StrictMode>
    );
  }
}

export default Layout;
