import virtool.utils

from pymongo import ReturnDocument
from cerberus import Validator

from virtool.handlers.utils import protected, bad_request, invalid_input, unpack_json_request, json_response, not_found
from virtool.permissions import PERMISSIONS
from virtool.groups import merge_group_permissions
from virtool.users import projection, processor, user_exists, hash_password


@protected("manage_users")
async def find(req):
    """
    Get a list of the existing ``user_ids`` in the database.
     
    """
    return json_response(await req.app["db"].users.distinct("_id"))


@protected("manage_users")
async def get(req):
    """
    Get a near-complete user document. Password data are removed.
     
    """
    document = await req.app["db"].users.find_one(req.match_info["user_id"], projection)

    if not document:
        return not_found()

    return json_response(processor(document))


@protected("manage_users")
async def create(req):
    """
    Add a new user to the user database.

    """
    db, data = await unpack_json_request(req)

    v = Validator({
        "user_id": {"type": "string", "required": True},
        "password": {"type": "string", "required": True},
        "force_reset": {"type": "boolean"}
    })

    if not v(data):
        return invalid_input(v.errors)

    # Check if the username is already taken. Fail if it does.
    if await user_exists(db, data["user_id"]):
        return bad_request("User already exists")

    document = {
        "_id": data["user_id"],
        # A list of group _ids the user is associated with.
        "groups": list(),
        "settings": {
            "skip_quick_analyze_dialog": True,
            "show_ids": True,
            "show_versions": True,
            "quick_analyze_algorithm": "pathoscope_bowtie"
        },
        "sessions": [],
        "permissions": {permission: False for permission in PERMISSIONS},
        "password": hash_password(data["password"]),
        "primary_group": "",
        # Should the user be forced to reset their password on their next login?
        "force_reset": data.get("force_reset", True),
        # A timestamp taken at the last password change.
        "last_password_change": virtool.utils.timestamp(),
        # Should all of the user's sessions be invalidated so that they are forced to login next time they
        # download the client.
        "invalidate_sessions": False
    }

    await db.users.insert(document)
    
    return json_response(processor({key: document[key] for key in projection}))


@protected("manage_users")
async def set_password(req):
    """
    Used by users with the *modify_options* permission to change other users passwords.

    """
    data = await req.json()

    v = Validator({
        "password": {"type": "string", "required": True}
    })

    if not v(data):
        return invalid_input(v.errors)

    user_id = req.match_info["user_id"]

    if not await user_exists(req.app["db"], user_id):
        return not_found()

    document = await req.app["db"].users.find_one_and_update({"_id": user_id}, {
        "$set": {
            "password": hash_password(data["password"]),
            "last_password_change": virtool.utils.timestamp(),
            "invalidate_sessions": True
        }
    }, return_document=ReturnDocument.AFTER, projection=["force_reset", "last_password_change"])

    document["user_id"] = document.pop("_id")

    return json_response(document)


@protected("manage_users")
async def set_force_reset(req):
    """
    Used by users with the *modify_options* permission to Set a users password. Can take a "reset" property, which
    when True will force the user to reset their password on next login. To be called by an connection with
    administrative privileges.

    """
    user_id = req.match_info["user_id"]

    data = await req.json()

    v = Validator({
        "force_reset": {"type": "boolean", "required": True}
    })

    if not v(data):
        return invalid_input(v.errors)

    if not await user_exists(req.app["db"], user_id):
        return not_found("User does not exist")

    document = await req.app["db"].users.find_one_and_update({"_id": user_id}, {
        "$set": {
            "force_reset": data["force_reset"],
            "invalidate_sessions": True
        }
    }, return_document=ReturnDocument.AFTER, projection=["force_reset"])

    document["user_id"] = document.pop("_id")

    return json_response(document)


@protected("manage_users")
async def add_group(req):
    """
    Enable membership in a group for the given user.

    """
    db, data = await unpack_json_request(req)

    user_id = req.match_info["user_id"]

    v = Validator({
        "group_id": {"type": "string", "required": True}
    })

    if not v(data):
        return invalid_input(v.errors)

    if not await user_exists(db, user_id):
        return not_found("User does not exist")

    if data["group_id"] not in await db.groups.distinct("_id"):
        return not_found("Group does not exist")

    document = await db.users.find_one_and_update({"_id": user_id}, {
        "$addToSet": {
            "groups": data["group_id"]
        }
    }, return_document=ReturnDocument.AFTER, projection=["groups"])

    groups = await db.groups.find({"_id": {"$in": document["groups"]}}).to_list(None)

    new_permissions = merge_group_permissions(groups)

    document = await db.users.find_one_and_update({"_id": user_id}, {
        "$set": {
            "permissions": new_permissions
        }
    }, return_document=ReturnDocument.AFTER, projection=["groups", "permissions"])

    document["user_id"] = document.pop("_id")

    return json_response(document)


@protected("manage_users")
async def remove_group(req):
    """
    Disable membership in a group for the given user.

    """
    db = req.app["db"]

    user_id = req.match_info["user_id"]
    group_id = req.match_info["group_id"]

    if not await user_exists(db, user_id):
        return not_found("User does not exist")

    if group_id == "administrator" and user_id == req["session"].user_id:
        return bad_request("Administrators cannot remove themselves from the administrator group")

    document = await db.users.find_one_and_update({"_id": user_id}, {
        "$pull": {
            "groups": group_id
        }
    }, return_document=ReturnDocument.AFTER, projection=["groups"])

    groups = await db.groups.find({"_id": {
        "$in": document["groups"]
    }}).to_list(None)

    document = await db.users.find_one_and_update({"_id": user_id}, {
        "$set": {
            "permissions": merge_group_permissions(list(groups))
        }
    }, return_document=ReturnDocument.AFTER, projection=["groups", "permissions"])

    document["user_id"] = document.pop("_id")

    return json_response(document)


@protected("manage_users")
async def remove(req):
    """
    Remove a user.

    """
    user_id = req.match_info["user_id"]

    if user_id == req["session"].user_id:
        return bad_request("Cannot remove own account")

    result = await req.app["db"].users.remove({"_id": user_id})

    if result["n"] == 0:
        return not_found("User does not exist")

    return json_response({"removed": user_id})
