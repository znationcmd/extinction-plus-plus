export function developerPortalPage(){
 return '<!doctype html><html lang="fr"><head>'+
   '<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'+
   '<meta name="theme-color" content="#17151e"><meta name="robots" content="noindex,nofollow">'+
   '<title>Portail développeur · CMD Sphere</title>'+
   '<link rel="stylesheet" href="/cmd-developer-portal.css?v=1">'+
   '</head><body>'+
   '<header class="dev-top"><a class="dev-brand" href="/dashboard">CMD <span>Sphere Développeur</span></a>'+
   '<nav class="dev-toplinks" aria-label="Navigation principale"><a href="/dashboard">CMD Sphere</a><a href="/apps/directory">Applications</a><a href="/cmd-sphere-developpeur">Aide</a></nav>'+
   '<div class="dev-status" id="dev-status" title="Le portail ne lance aucune actualisation en arrière-plan"><i class="dev-dot" id="dev-dot"></i><span id="dev-activity">Actif</span></div></header>'+
   '<div class="dev-layout"><aside class="dev-sidebar" aria-label="Rubriques développeur">'+
   '<a class="dev-home" href="/developers">← Mes applications</a>'+
   '<select id="dev-app-switch" aria-label="Choisir une application"><option value="">Mes applications</option></select>'+
   '<button type="button" class="dev-nav" data-dev-tab="home">Applications</button>'+
   '<h3>Application</h3>'+
   '<button type="button" class="dev-nav" data-dev-tab="overview">Informations générales</button>'+
   '<button type="button" class="dev-nav" data-dev-tab="installation">Installation</button>'+
   '<button type="button" class="dev-nav" data-dev-tab="oauth2">OAuth2</button>'+
   '<button type="button" class="dev-nav" data-dev-tab="bot">Bot</button>'+
   '<button type="button" class="dev-nav" data-dev-tab="commands">Commandes</button>'+
   '<h3>Personnalisation</h3>'+
   '<button type="button" class="dev-nav" data-dev-tab="webhooks">Webhooks</button>'+
   '<button type="button" class="dev-nav" data-dev-tab="activities">Activités</button>'+
   '<button type="button" class="dev-nav" data-dev-tab="presence">Rich Presence</button>'+
   '<button type="button" class="dev-nav" data-dev-tab="discovery">Annuaire</button>'+
   '<h3>Gestion</h3>'+
   '<button type="button" class="dev-nav" data-dev-tab="team">Équipe</button>'+
   '<button type="button" class="dev-nav" data-dev-tab="testing">Testeurs</button>'+
   '<button type="button" class="dev-nav" data-dev-tab="analytics">Statistiques</button>'+
   '<button type="button" class="dev-nav" data-dev-tab="monetization">Monétisation</button>'+
   '<button type="button" class="dev-nav" data-dev-tab="documentation">Documentation API</button>'+
   '</aside>'+
   '<main id="dev-content" aria-live="polite"><h1>Applications CMD Sphere</h1><p>Chargement…</p></main></div>'+
   '<script defer src="/cmd-developer-portal-client.js?v=1"></script>'+
   '</body></html>';
}
