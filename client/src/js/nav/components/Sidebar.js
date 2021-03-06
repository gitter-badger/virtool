import React from "react";
import { connect } from "react-redux";
import { Route, Switch, withRouter } from "react-router-dom";
import { Nav } from "react-bootstrap";
import SidebarItem from "./SidebarItem";

export const Sidebar = ({ administrator }) => (
    <Switch>
        <Route path="/home">
            <Nav className="sidebar">
                <SidebarItem title="About" link="/home" icon="info-circle" />
            </Nav>
        </Route>
        <Route path="/jobs">
            <Nav className="sidebar">
                <SidebarItem
                    exclude={["/jobs/resources", "/jobs/settings"]}
                    title="Browse"
                    link="/jobs"
                    icon="th-list"
                />
                <SidebarItem title="Resources" link="/jobs/resources" icon="tachometer-alt" />
                {administrator ? <SidebarItem title="Settings" link="/jobs/settings" icon="cogs" /> : null}
            </Nav>
        </Route>
        <Route path="/samples">
            <Nav className="sidebar">
                <SidebarItem
                    exclude={["/samples/files", "/samples/settings"]}
                    title="Browse"
                    link="/samples"
                    icon="th-list"
                />
                <SidebarItem title="Files" link="/samples/files" icon="folder-open" />
                {administrator ? <SidebarItem title="Settings" link="/samples/settings" icon="cogs" /> : null}
            </Nav>
        </Route>
        <Route path="/refs">
            <Nav className="sidebar">
                <SidebarItem exclude={["/refs/settings"]} title="Browse" link="/refs" icon="th-list" />
                {administrator ? <SidebarItem title="Settings" link="/refs/settings" icon="cogs" /> : null}
            </Nav>
        </Route>
        <Route path="/subtraction">
            <Nav className="sidebar">
                <SidebarItem exclude={["/subtraction/files"]} title="Browse" link="/subtraction" icon="th-list" />
                <SidebarItem title="Files" link="/subtraction/files" icon="folder-open" />
            </Nav>
        </Route>
        <Route path="/hmm">
            <Nav className="sidebar">
                <SidebarItem exclude={["/hmm/settings"]} title="Browse" link="/hmm" icon="th-list" />
                {administrator ? <SidebarItem title="Settings" link="/hmm/settings" icon="cogs" /> : null}
            </Nav>
        </Route>
    </Switch>
);

const mapStateToProps = state => ({
    administrator: state.account.administrator
});

export default withRouter(
    connect(
        mapStateToProps,
        null
    )(Sidebar)
);
