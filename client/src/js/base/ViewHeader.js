import React from "react";
import PropTypes from "prop-types";
import Helmet from "react-helmet";
import { Badge } from "react-bootstrap";
import { isUndefined } from "lodash-es";
import { Flex, FlexItem } from "./index";

/**
 * A reusable header shown at the top of views that browse through paged items. For example, the OTU browser
 * contains a ``<ViewHeader />`` component with the title 'OTUs', and optional children.
 *
 * @func
 * @param title {string} the main title for the headed view
 * @param totalCount {count} the total number of documents
 */
export const ViewHeader = ({ title, totalCount, children }) => (
    <h3 className="view-header">
        <Helmet>
            <title>{title}</title>
        </Helmet>
        {isUndefined(totalCount) ? null : (
            <Flex alignItems="flex-end">
                <FlexItem grow={0} shrink={0}>
                    <strong>{title}</strong> <Badge>{totalCount}</Badge>
                </FlexItem>
            </Flex>
        )}
        {children}
    </h3>
);

ViewHeader.propTypes = {
    title: PropTypes.string.isRequired,
    totalCount: PropTypes.number,
    children: PropTypes.node
};
