import type { Plugin } from 'vite';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

/**
 * Conditionally injects analytics scripts based on dory.json config.
 * PostHog is only injected if `analytics.posthog.token` is configured.
 */
export function analyticsInjector(): Plugin {
  return {
    name: 'analytics-injector',
    transformIndexHtml(html) {
      const doryJsonPath = resolve(process.cwd(), 'docs', 'dory.json');
      if (!existsSync(doryJsonPath)) return html;

      try {
        const config = JSON.parse(readFileSync(doryJsonPath, 'utf-8'));

        if (config.analytics?.posthog?.token) {
          const token = config.analytics.posthog.token;
          const apiHost = config.analytics.posthog.apiHost || 'https://us.i.posthog.com';

          const script = `
    <script>
        !function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.crossOrigin="anonymous",p.async=!0,p.src=s.api_host.replace(".i.posthog.com","-assets.i.posthog.com")+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="init capture identify setPersonProperties group resetGroups reset get_distinct_id getGroups get_session_id opt_in_capturing opt_out_capturing has_opted_in_capturing has_opted_out_capturing".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);
        posthog.init('${token}', {
            api_host: '${apiHost}',
            person_profiles: 'identified_only',
        })
    </script>`;

          return html.replace('</head>', `${script}\n  </head>`);
        }

        return html;
      } catch (error) {
        const detail = error instanceof SyntaxError ? error.message : String(error);
        console.error(`Failed to parse dory.json for analytics injection: ${detail}`);
        return html;
      }
    },
  };
}
