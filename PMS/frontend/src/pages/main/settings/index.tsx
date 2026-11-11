import { PageMeta } from "@/components/shared/page-meta";
import { TextField } from "@/components/shared/pms/form-bits";
import { PageHeader, Panel } from "@/components/shared/pms/ui-bits";
import { Button } from "@/components/ui/button";
import { getUsername } from "@/lib/auth";
import { useState } from "react";


export default function SettingsPage() {
  const [username, setUsername] = useState(getUsername());
  const [checkIn, setCheckIn] = useState("14:00");
  const [checkOut, setCheckOut] = useState("11:00");
  const [saved, setSaved] = useState(false);

  return (
    <>
      <PageMeta title="Settings | PMS Console" description="Workspace settings" />
      <PageHeader title="Settings" description="Workspace defaults. Changes are kept in this session only." />
      <Panel title="General" bodyClassName="p-5">
        <form
          className="grid max-w-3xl gap-4 sm:grid-cols-2"
          onSubmit={(e) => { e.preventDefault(); setSaved(true); }}
          onChange={() => setSaved(false)}
        >
          <TextField label="Username" value={username} onChange={setUsername} />
          <div />
          <TextField label="Default check-in time" type="time" value={checkIn} onChange={setCheckIn} />
          <TextField label="Default check-out time" type="time" value={checkOut} onChange={setCheckOut} />
          <div className="flex items-center gap-3 sm:col-span-2">
            <Button type="submit">Save settings</Button>
            {saved && <span role="status" className="text-sm text-emerald-600">Saved</span>}
          </div>
        </form>
      </Panel>
    </>
  );
}
