// Independently written server integration using the public DayZ script interfaces.
class RSSActor
{
    string uid;
    string name;
    float x;
    float z;
};
class RSSEvent
{
    string id;
    string type;
    string weapon;
    ref array<ref RSSActor> actors = new array<ref RSSActor>;
};
class RSSHeartbeat
{
    int protocol = 1;
    string runId;
    bool delivery = true;
    bool kits = true;
};
class RSSKitItem
{
    string className;
    int quantity;
};
class RSSDelivery
{
    string id;
    string playerUid;
    string className;
    int quantity;
    ref array<ref RSSKitItem> items = new array<ref RSSKitItem>;
};
class RSSDeliveryResult
{
    string id;
    string status;
    string result;
};
class ExtinctionRSSBridge
{
    static ref ExtinctionRSSBridge s_Instance;
    string m_Root = "$profile:ExtinctionRSS";
    string m_Run;
    int m_Sequence;
    ref map<string, ref RSSActor> m_Players = new map<string, ref RSSActor>;
    ref array<ref RSSEvent> m_Events = new array<ref RSSEvent>;
    static ExtinctionRSSBridge Get()
    {
        if (!s_Instance) s_Instance = new ExtinctionRSSBridge;
        return s_Instance;
    }
    void ExtinctionRSSBridge()
    {
        int y, month, day, h, minute, second;
        GetYearMonthDayUTC(y, month, day);
        GetHourMinuteSecondUTC(h, minute, second);
        int random = Math.RandomIntInclusive(1, 2000000000);
        m_Run = y.ToString() + month.ToString() + day.ToString() + "-" + h.ToString() + minute.ToString() + second.ToString() + "-" + random.ToString();
        MakeDirectory(m_Root);
        MakeDirectory(m_Root + "/events");
        MakeDirectory(m_Root + "/delivery_requests");
        MakeDirectory(m_Root + "/delivery_started");
        MakeDirectory(m_Root + "/delivery_results");
    }
    RSSActor Actor(PlayerBase player)
    {
        if (!player || !player.GetIdentity()) return null;
        RSSActor actor = new RSSActor;
        actor.uid = player.GetIdentity().GetId();
        actor.name = player.GetIdentity().GetName();
        vector position = player.GetPosition();
        actor.x = position[0];
        actor.z = position[2];
        return actor;
    }
    void Emit(string type, RSSActor first, RSSActor second = null, string weapon = "")
    {
        if (!first || first.uid == "" || !GetGame().IsServer()) return;
        if (m_Events.Count() >= 1000) return; // bounded backlog; no unbounded memory growth
        RSSEvent event = new RSSEvent;
        m_Sequence++;
        event.id = m_Run + "-" + m_Sequence.ToString();
        event.type = type;
        event.weapon = weapon;
        event.actors.Insert(first);
        if (second) event.actors.Insert(second);
        m_Events.Insert(event);
    }
    void Killed(PlayerBase victim, Object killer)
    {
        RSSActor first = Actor(victim);
        PlayerBase attacker = PlayerBase.Cast(killer);
        EntityAI entity = EntityAI.Cast(killer);
        if (!attacker && entity) attacker = PlayerBase.Cast(entity.GetHierarchyRootPlayer());
        RSSActor second = Actor(attacker);
        string weapon = "";
        if (killer) weapon = killer.GetType();
        if (second && first && second.uid != first.uid) Emit("kill", first, second, weapon);
        else if (second && first && second.uid == first.uid) Emit("suicide", first);
        else Emit("death", first);
    }
    int PendingFiles()
    {
        string name;
        FileAttr attributes;
        FindFileHandle handle = FindFile(m_Root + "/events/*.json", name, attributes, FindFileFlags.DIRECTORIES);
        int count;
        if (handle)
        {
            do { if (name != "") count++; } while (count < 1000 && FindNextFile(handle, name, attributes));
            CloseFindFile(handle);
        }
        return count;
    }
    void Tick()
    {
        if (!GetGame().IsServer()) return;
        string error;
        RSSHeartbeat heartbeat = new RSSHeartbeat;
        heartbeat.runId = m_Run;
        JsonFileLoader<RSSHeartbeat>.SaveFile(m_Root + "/alive.json", heartbeat, error);
        array<Man> players = new array<Man>;
        GetGame().GetPlayers(players);
        ref map<string, ref RSSActor> current = new map<string, ref RSSActor>;
        foreach (Man man : players)
        {
            PlayerBase player = PlayerBase.Cast(man);
            RSSActor actor = Actor(player);
            if (!actor) continue;
            current.Insert(actor.uid, actor);
            if (!m_Players.Contains(actor.uid)) Emit("connect", actor);
            if (player.IsAlive()) Emit("position", actor);
        }
        foreach (string uid, RSSActor previous : m_Players)
        {
            if (!current.Contains(uid)) Emit("disconnect", previous);
        }
        m_Players = current;
        int available = 1000 - PendingFiles();
        int saved;
        while (saved < 50 && m_Events.Count() > 0 && saved < available)
        {
            RSSEvent event = m_Events[0];
            string temporary = m_Root + "/events/" + event.id + ".tmp";
            string destination = m_Root + "/events/" + event.id + ".json";
            if (!JsonFileLoader<RSSEvent>.SaveFile(temporary, event, error)) break;
            // A readiness marker is written only after the complete JSON was copied.
            if (!CopyFile(temporary, destination)) break;
            FileHandle ready = OpenFile(destination + ".ready", FileMode.WRITE);
            if (!ready) break;
            FPrint(ready, "ready");
            CloseFile(ready);
            DeleteFile(temporary);
            m_Events.Remove(0);
            saved++;
        }
        Deliver(players);
    }
    void Result(string id, string status, string description)
    {
        RSSDeliveryResult result = new RSSDeliveryResult;
        result.id = id;
        result.status = status;
        result.result = description;
        string error;
        string target = m_Root + "/delivery_results/" + id + ".json";
        if (JsonFileLoader<RSSDeliveryResult>.SaveFile(target, result, error)) DeleteFile(m_Root + "/delivery_requests/" + id + ".json");
    }
    void Deliver(array<Man> players)
    {
        string name;
        FileAttr attributes;
        FindFileHandle handle = FindFile(m_Root + "/delivery_requests/*.json", name, attributes, FindFileFlags.DIRECTORIES);
        if (!handle) return;
        int processed;
        do
        {
            if (name == "" || processed >= 5) break;
            processed++;
            RSSDelivery request;
            string error;
            string path = m_Root + "/delivery_requests/" + name;
            if (!JsonFileLoader<RSSDelivery>.LoadFile(path, request, error)) continue;
            if (!request || request.id == "" || name != request.id + ".json") continue;
            // Durable marker precedes all inventory changes. Never retry an uncertain delivery.
            string marker = m_Root + "/delivery_started/" + request.id + ".json";
            if (FileExist(marker)) { Result(request.id, "delivery_uncertain", "Already started; staff review required"); continue; }
            PlayerBase recipient;
            foreach (Man man : players)
            {
                PlayerBase candidate = PlayerBase.Cast(man);
                if (candidate && candidate.GetIdentity() && candidate.IsAlive() && candidate.GetIdentity().GetId() == request.playerUid) { recipient = candidate; break; }
            }
            if (!recipient) continue; // wait for the verified player to connect
            if (request.items.Count() == 0)
            {
                RSSKitItem single = new RSSKitItem;
                single.className = request.className;
                single.quantity = request.quantity;
                request.items.Insert(single);
            }
            int total;
            bool valid = request.items.Count() <= 20;
            foreach (RSSKitItem content : request.items)
            {
                if (!content || content.quantity < 1 || content.quantity > 100 || !GetGame().ConfigIsExisting("CfgVehicles " + content.className)) { valid = false; break; }
                total += content.quantity;
            }
            if (!valid || total > 100) { Result(request.id, "delivery_uncertain", "Invalid kit; no items spawned"); continue; }
            if (!JsonFileLoader<RSSDelivery>.SaveFile(marker, request, error)) continue;
            int delivered;
            bool failed;
            foreach (RSSKitItem entry : request.items)
            {
                for (int i = 0; i < entry.quantity; i++)
                {
                    EntityAI item = recipient.GetInventory().CreateInInventory(entry.className);
                    if (!item) { failed = true; break; }
                    delivered++;
                }
                if (failed) break;
            }
            if (delivered == total) Result(request.id, "delivered", "Items created in player inventory");
            else Result(request.id, "delivery_uncertain", "Partial delivery; staff must check inventory");
        } while (FindNextFile(handle, name, attributes));
        CloseFindFile(handle);
    }
};
modded class PlayerBase
{
    override void EEKilled(Object killer)
    {
        if (GetGame().IsServer()) ExtinctionRSSBridge.Get().Killed(this, killer);
        super.EEKilled(killer);
    }
};
