import unittest
import io

from backend.app import (
    ACTIVITY_EVENTS,
    HOUSEHOLDS,
    INVITES,
    PANTRY_ITEMS,
    SHOPPING_LIST_ITEMS,
    UNDO_ACTIONS,
    USER_HOUSEHOLD,
    USERS,
    app,
)


class FeatureFlowTests(unittest.TestCase):
    def setUp(self):
        self.client = app.test_client()
        USERS.clear()
        PANTRY_ITEMS.clear()
        SHOPPING_LIST_ITEMS.clear()
        ACTIVITY_EVENTS.clear()
        UNDO_ACTIONS.clear()
        HOUSEHOLDS.clear()
        INVITES.clear()
        USER_HOUSEHOLD.clear()

        signup = self.client.post("/auth/signup", json={"email": "test@example.com", "password": "password"})
        payload = signup.get_json()
        self.token = payload["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}

    def test_shopping_list_and_reminders(self):
        res = self.client.get("/reminders", headers=self.headers)
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertIn("expired", data)

        add_res = self.client.post("/shopping-list", headers=self.headers, json={"name": "Olive oil"})
        self.assertEqual(add_res.status_code, 201)
        get_res = self.client.get("/shopping-list", headers=self.headers)
        self.assertEqual(get_res.status_code, 200)
        self.assertGreaterEqual(len(get_res.get_json()), 1)

    def test_consume_and_undo(self):
        items = self.client.get("/items", headers=self.headers).get_json()
        self.assertTrue(items)
        item_id = items[0]["id"]

        consume = self.client.post(f"/items/{item_id}/consume", headers=self.headers, json={"amount": 1})
        self.assertEqual(consume.status_code, 200)
        undo_token = consume.get_json().get("undo_token")
        self.assertTrue(undo_token)

        undo = self.client.post("/actions/undo", headers=self.headers, json={"undo_token": undo_token})
        self.assertEqual(undo.status_code, 200)

    def test_household_create_and_invite(self):
        create = self.client.post("/household", headers=self.headers, json={"name": "Family"})
        self.assertEqual(create.status_code, 201)
        invite = self.client.post("/household/invite", headers=self.headers)
        self.assertEqual(invite.status_code, 200)
        self.assertTrue(invite.get_json().get("invite_code"))

    def test_profile_get_update_and_photo_upload(self):
        get_profile = self.client.get("/profile", headers=self.headers)
        self.assertEqual(get_profile.status_code, 200)
        self.assertIn("name", get_profile.get_json())

        update_profile = self.client.put("/profile", headers=self.headers, json={"name": "Wise User"})
        self.assertEqual(update_profile.status_code, 200)
        self.assertEqual(update_profile.get_json().get("name"), "Wise User")

        upload_ok = self.client.post(
            "/profile/photo",
            headers=self.headers,
            data={"photo": (io.BytesIO(b"\x89PNG\r\n\x1a\nfake"), "avatar.png")},
            content_type="multipart/form-data",
        )
        self.assertEqual(upload_ok.status_code, 200)
        self.assertTrue(upload_ok.get_json().get("photo_url"))

        upload_bad = self.client.post(
            "/profile/photo",
            headers=self.headers,
            data={"photo": (io.BytesIO(b"plain"), "avatar.txt")},
            content_type="multipart/form-data",
        )
        self.assertEqual(upload_bad.status_code, 400)


if __name__ == "__main__":
    unittest.main()
