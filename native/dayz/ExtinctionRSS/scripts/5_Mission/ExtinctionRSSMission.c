modded class MissionServer
{
    override void OnInit()
    {
        super.OnInit();
        ExtinctionRSSBridge bridge = ExtinctionRSSBridge.Get();
        GetGame().GetCallQueue(CALL_CATEGORY_SYSTEM).CallLater(bridge.Tick, 5000, true);
    }
    override void OnMissionFinish()
    {
        GetGame().GetCallQueue(CALL_CATEGORY_SYSTEM).Remove(ExtinctionRSSBridge.Get().Tick);
        ExtinctionRSSBridge.s_Instance = null;
        super.OnMissionFinish();
    }
};
