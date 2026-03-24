import { render, screen } from "@testing-library/react";
import ReminderCenter from "./ReminderCenter";

test("renders reminder counts", () => {
  render(<ReminderCenter reminders={{ expired: [{ id: 1 }], today: [{ id: 2 }, { id: 3 }], soon: [] }} />);
  expect(screen.getByText(/Expired/i)).toBeInTheDocument();
  expect(screen.getByText("1")).toBeInTheDocument();
  expect(screen.getByText("2")).toBeInTheDocument();
});
