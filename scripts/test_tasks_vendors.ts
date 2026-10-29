import { createClient } from "@supabase/supabase-js";

const url = "https://yblhtchviuslhfwiwyuo.supabase.co";
const key = "sb_publishable_JIVAnr1UtPOngL8UV5ITdw_uCsNaSpV";
const client = createClient(url, key);

async function main() {
  console.log("== Starting Crew Tasks & Vendors Verification ==");

  // 1. Authenticate as admin
  const { error: authError } = await client.auth.signInWithPassword({
    email: "admin@xenoent.com",
    password: "Password123!",
  });
  if (authError) throw new Error(`Auth failed: ${authError.message}`);
  console.log("✓ Authenticated as admin@xenoent.com");

  // 2. Fetch a test event
  const { data: events, error: eventErr } = await client
    .from("events")
    .select("id, title")
    .limit(1);
  if (eventErr || !events || events.length === 0) throw new Error("No event found");
  const testEventId = events[0].id;
  console.log(`✓ Using test event: "${events[0].title}" (${testEventId})`);

  // 3. Fetch a profile for task assignment
  const { data: profiles } = await client.from("profiles").select("id, full_name").limit(1);
  const assigneeId = profiles && profiles.length > 0 ? profiles[0].id : null;
  console.log(`✓ Using profile: ${profiles?.[0]?.full_name || "none"}`);

  // 4. Test Crew Task CRUD
  console.log("\n-- Testing Crew Tasks CRUD --");
  // 4a. Create task
  const { data: task, error: taskCreateErr } = await client
    .from("event_tasks")
    .insert({
      event_id: testEventId,
      title: "Test Task - Rig Sound & Lights",
      description: "Automated test checklist item",
      assigned_to: assigneeId,
      priority: "high",
      status: "todo",
      due_date: new Date(Date.now() + 86400000).toISOString(),
    })
    .select("*, assignee:profiles!assigned_to(*)")
    .single();

  if (taskCreateErr || !task) throw new Error(`Task create failed: ${taskCreateErr?.message}`);
  console.log(`✓ Task created: id=${task.id}, title="${task.title}", assignee=${task.assignee?.full_name}`);

  // 4b. Update task
  const { data: updatedTask, error: taskUpdateErr } = await client
    .from("event_tasks")
    .update({
      title: "Test Task - Rig Sound & Lights (UPDATED)",
      status: "done",
      priority: "urgent",
    })
    .eq("id", task.id)
    .select("*")
    .single();

  if (taskUpdateErr || !updatedTask) throw new Error(`Task update failed: ${taskUpdateErr?.message}`);
  console.log(`✓ Task updated: status=${updatedTask.status}, priority=${updatedTask.priority}`);

  // 4c. Delete task
  const { error: taskDelErr } = await client.from("event_tasks").delete().eq("id", task.id);
  if (taskDelErr) throw new Error(`Task delete failed: ${taskDelErr.message}`);
  console.log(`✓ Task deleted successfully`);

  // 5. Test Event Vendors
  console.log("\n-- Testing Event Vendors Workflow --");
  // 5a. Assign existing vendor
  const { data: existingVendors } = await client.from("vendors").select("id, name").limit(1);
  if (existingVendors && existingVendors.length > 0) {
    const v = existingVendors[0];
    const { data: ev, error: evErr } = await client
      .from("event_vendors")
      .upsert(
        {
          event_id: testEventId,
          vendor_id: v.id,
          service_name: "Layanan Audio & Lighting Uji Coba",
          cost: 15000000,
          status: "contracted",
          notes: "Testing existing vendor assignment",
        },
        { onConflict: "event_id,vendor_id" }
      )
      .select("*, vendor:vendors(*)")
      .single();

    if (evErr) throw new Error(`Existing vendor assign failed: ${evErr.message}`);
    console.log(`✓ Existing vendor assigned: vendor="${ev.vendor?.name}", cost=${ev.cost}`);

    // Clean up assignment
    await client.from("event_vendors").delete().eq("id", ev.id);
    console.log(`✓ Existing vendor assignment cleaned up`);
  }

  // 5b. Create new vendor on the spot & assign immediately
  const uniqueVendorName = `Mitra Baru Test ${Date.now()}`;
  console.log(`Creating new on-the-spot vendor: "${uniqueVendorName}"`);

  // Insert into vendors
  const { data: newVendor, error: newVErr } = await client
    .from("vendors")
    .insert({
      name: uniqueVendorName,
      category: "Special FX & Pyrotechnics",
      pic_name: "Hendro FX",
      phone: "+62812999888",
      email: "hendro@fxpro.id",
      notes: "CO2 jet & cold spark machines",
    })
    .select("*")
    .single();

  if (newVErr || !newVendor) throw new Error(`Create new vendor failed: ${newVErr?.message}`);
  console.log(`✓ Master vendor created: id=${newVendor.id}, name="${newVendor.name}"`);

  // Insert into event_vendors junction
  const { data: newEV, error: newEVErr } = await client
    .from("event_vendors")
    .insert({
      event_id: testEventId,
      vendor_id: newVendor.id,
      service_name: "Cold Spark & CO2 Cannon Package",
      cost: 22000000,
      status: "contracted",
      notes: "4 nozzle CO2 jets, 4 cold spark indoor",
    })
    .select("*, vendor:vendors(*)")
    .single();

  if (newEVErr || !newEV) throw new Error(`Link new vendor failed: ${newEVErr?.message}`);
  console.log(`✓ New vendor linked to event: service="${newEV.service_name}", cost=${newEV.cost}`);

  // Clean up
  await client.from("event_vendors").delete().eq("id", newEV.id);
  await client.from("vendors").delete().eq("id", newVendor.id);
  console.log(`✓ Test vendor cleaned up`);

  console.log("\n== ALL TASKS AND VENDORS TESTS PASSED SUCCESSFULLY! ==");
}

main().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
