import React from "react";
import { connect } from "react-redux";
import { Row, Col, Panel } from "react-bootstrap";
import { ListGroupItem, Checkbox } from "../../base";

import { addUserToGroup, removeUserFromGroup } from "../actions";

const UserGroups = (props) => {

    const groupComponents = props.allGroups.map(groupId => {

        const toggled = props.memberGroups.includes(groupId);

        return (
            <Col xs={12} md={4} key={groupId}>
                <ListGroupItem
                    className="text-capitalize"
                    onClick={() => (toggled ? props.removeFromGroup : props.addToGroup)(props.userId, groupId)}
                    disabled={groupId === "administrator" && props.userId === props.accountUserId}
                >
                    {groupId}
                    <Checkbox checked={toggled} pullRight />
                </ListGroupItem>
            </Col>
        );
    });

    return (
        <Panel>
            <Row>
                {groupComponents}
            </Row>
        </Panel>
    );
};

const mapStateToProps = state => ({
    accountUserId: state.account.id,
    allGroups: state.groups.list.map(group => group.id)
});

const mapDispatchToProps = dispatch => ({

    addToGroup: (userId, groupId) => {
        dispatch(addUserToGroup(userId, groupId));
    },

    removeFromGroup: (userId, groupId) => {
        dispatch(removeUserFromGroup(userId, groupId));
    }

});

const Container = connect(mapStateToProps, mapDispatchToProps)(UserGroups);

export default Container;
