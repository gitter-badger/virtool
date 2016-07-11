/**
 * @license
 * The MIT License (MIT)
 * Copyright 2015 Government of Canada
 *
 * @author
 * Ian Boyes
 *
 * @exports JobsTable
 */

'use strict';

var React = require('react');

var ProgressBar = require('./ProgressBar.jsx');
var Detail = require('./Detail/Detail.jsx');
var Filter = require('./Filter.jsx');

var Icon = require('virtool/js/components/Base/Icon.jsx');
var DynamicTable = require('virtool/js/components/Base/DynamicTable/DynamicTable.jsx');
var RelativeTime = require('virtool/js/components/Base/RelativeTime.jsx');
var ConfirmModal = require('virtool/js/components/Base/ConfirmModal.jsx');
var ConfirmManagerMixin = require('virtool/js/components/Base/Mixins/ConfirmManagerMixin');
var DetailModal = require('virtool/js/components/Base/DetailModal.jsx');

/**
 * A DynamicTable component used to display job documents.
 *
 * @class
 */
var JobsTable = React.createClass({

    mixins: [ConfirmManagerMixin],

    propTypes: {
        collection: React.PropTypes.object.isRequired,
        baseFilter: React.PropTypes.object
    },

    getInitialState: function () {
        return {
            // An object describing the document to fetch and open detail for.
            detailTarget: null,

            canCancel: dispatcher.user.permissions.cancel_job,
            canArchive: dispatcher.user.permissions.archive_job,
            canRemove: dispatcher.user.permissions.remove_job
        };
    },

    componentDidMount: function () {
        dispatcher.user.on('change', this.onUserChange);
        dispatcher.router.on('change', this.onRouteChange);
    },

    componentWillMount: function () {
        dispatcher.user.off('change', this.onUserChange);
        dispatcher.router.off('change', this.onRouteChange);
    },

    onUserChange: function () {
        this.setState({
            canCancel: dispatcher.user.permissions.cancel_job,
            canRemove: dispatcher.user.permissions.remove_job,
            canArchive: dispatcher.user.permissions.archive_job
        });
    },

    onRouteChange: function (route) {
        console.log(route.extra);
        var detailTarget = route.extra[0] ? _.find(dispatcher.collections.jobs.documents, {_id: route.extra[0]}): null;
        console.log(detailTarget);
        this.setState({detailTarget: detailTarget});
    },

    /**
     * Hides the detail modal by setting state.detailTarget to null. Pass as an 'onHide' prop.
     *
     * @func
     */
    hideDetail: function () {
        dispatcher.router.setExtra([]);
    },

    /**
     * Opens a detail modal for the passed target (document) object. Called when an document row is clicked.
     *
     * @param target {object} - an object describing the document to fetch and open detail for.
     * @func
     */
    handleClick: function (target) {
        dispatcher.router.setExtra([target._id]);
    },

    /**
     * Precipitates an operation on one or more jobs. A confirm modal is shown to make sure the user want to follow
     * through with the operation. Valid operations are 'cancel, 'archive', and 'remove'.
     *
     * @param methodName {string} - the name of the server method to call.
     * @param targets {object} - a single target object or list of targets to remove.
     * @param success {func} - a function to call if the request is successful.
     * @param failure {func} - a function to call if the request fails.
     * @func
     */
    sendRequest: function (methodName, targets, success, failure) {
        if (!(targets instanceof Array)) targets = [targets];

        var callback = function () {
            this.props.collection.request(methodName, {_id: _.map(targets, '_id')}, success, failure);
        };

        this.confirmManager.show(methodName, callback, targets);
    },

    /**
     * The objects that describe the fields to be shown in the table.
     *
     * @array
     */
    fields: [
        {
            key: 'task',
            size: 3,
            render: function (document) {
                switch (document.task) {
                    case 'nuvs':
                        return 'NuVs';

                    case 'pathoscope_bowtie':
                        return 'PathoscopeBowtie';

                    case 'pathoscope_snap':
                        return 'PathoscopeSNAP';

                    default:
                        return _.startCase(document.task);
                }
            }
        },
        {
            key: 'progress',
            size: 4,
            render: function (document) { return <ProgressBar state={document.state} value={document.progress} />; }
        },
        {
            key: 'added',
            size: 2,
            render: function (document) { return <RelativeTime time={document.added} />; }
        },
        {
            key: 'username',
            size: 2,
            label: 'User'
        }
    ],

    render: function () {

        // Define a function for creating the actions button group component to place in the table header and in each
        // document for performing actions on selections and individual records respectively.
        var createActions = function (documents) {

            documents = documents instanceof Array ? documents: [documents];

            var hidden = {
                visibility: 'hidden'
            };

            var icons = [];

            if (documents.length > 0) {
                var waitingOrRunning = _.every(documents, function (document) {
                    return document.state === 'waiting' || document.state === 'running';
                });

                var canCancel = waitingOrRunning && this.state.canCancel;

                icons.push(<Icon
                    name='cancel-circle'
                    bsStyle={canCancel ? 'danger': null}
                    onClick={canCancel ? function () {this.sendRequest('cancel', documents)}.bind(this): null}
                    style={canCancel ? null: hidden}
                    pad={true}
                    key='cancel'
                />);

                var canArchive = (
                    !waitingOrRunning &&
                    _.every(documents, {archived: false}) &&
                    this.state.canArchive
                );

                var archiveIcon = <Icon
                    name='box-add'
                    bsStyle={canArchive ? 'info': null}
                    onClick={canArchive ? function () {this.sendRequest('archive', documents)}.bind(this): null}
                    style={canArchive ? null: hidden}
                    pad={true}
                    key='archive'
                />;

                canArchive ? icons.push(archiveIcon): icons.unshift(archiveIcon);

                var canRemove = !waitingOrRunning && dispatcher.user.permissions.remove_job;

                var removeIcon = <Icon
                    name='remove'
                    bsStyle={canRemove ? 'danger': null}
                    onClick={canRemove ? function () {this.sendRequest('remove_job', documents)}.bind(this): null}
                    style={canRemove ? null: hidden}
                    pad={true}
                    key='remove'
                />;

                canRemove ? icons.push(removeIcon): icons.unshift(removeIcon);
            }

            return (
                <span>
                    {icons}
                </span>
            );
        }.bind(this);

        var tableProps = {
            collection: this.props.collection,
            fields: this.fields,
            baseFilter: this.props.baseFilter,
            initialSortKey: 'progress',
            filterComponent: Filter,
            documentsNoun: 'jobs',
            selectable: true,
            onClick: this.handleClick,
            createActions: createActions
        };

        return (
            <div>
                <DynamicTable {...tableProps} />

                <ConfirmModal {...this.confirmManager.getProps()} noun='job' nameKey='task' />

                <DetailModal
                    target={this.state.detailTarget}
                    onHide={this.hideDetail}
                    contentComponent={Detail}
                    collection={this.props.collection}
                />
            </div>
        );
    }
});

module.exports = JobsTable;