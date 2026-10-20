import { beforeEach, describe, expect, it } from "vitest";
import { useCommandHistory } from "./command-history";

describe("project command retention", () => {
  beforeEach(() => useCommandHistory.setState({ projects: {} }));
  it("retains commands and drafts separately for each project", () => {
    const history = useCommandHistory.getState();
    history.setDraft("room-a", "Move the desk");
    history.record("room-a", { id: "1", instruction: "Add a desk", response: "Desk proposed" });
    history.setDraft("room-b", "Add a sofa");
    expect(useCommandHistory.getState().projects["room-a"]).toEqual({ draft: "Move the desk", entries: [{ id: "1", instruction: "Add a desk", response: "Desk proposed" }] });
    expect(useCommandHistory.getState().projects["room-b"]?.entries).toEqual([]);
  });
  it("updates a response without deleting earlier commands", () => {
    const history = useCommandHistory.getState();
    history.record("room", { id: "1", instruction: "Add a chair", response: "Chair proposed" });
    history.record("room", { id: "2", instruction: "Move it", response: "Working" });
    history.record("room", { id: "2", instruction: "Move it", response: "Move proposed" });
    expect(useCommandHistory.getState().projects["room"]?.entries.map(entry => entry.response)).toEqual(["Chair proposed", "Move proposed"]);
  });
});