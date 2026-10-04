class CfgPatches
{
    class ExtinctionRSS { units[] = {}; weapons[] = {}; requiredVersion = 0.1; requiredAddons[] = {"DZ_Data", "DZ_Scripts"}; };
};
class CfgMods
{
    class ExtinctionRSS
    {
        dir = "ExtinctionRSS"; name = "Extinction RSS server integration"; type = "mod";
        dependencies[] = {"World", "Mission"};
        class defs
        {
            class worldScriptModule { value = ""; files[] = {"ExtinctionRSS/scripts/4_World"}; };
            class missionScriptModule { value = ""; files[] = {"ExtinctionRSS/scripts/5_Mission"}; };
        };
    };
};
