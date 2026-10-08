# Steering

The first days were local agents. Late on 5 Oct, around 10 at night, I ran one continuous night with Grok Build and cursor-agent into midnight on the 6th; Firecrawl was the tool I used for the research and filtering during that stretch, and I went from research to a product.

I chose the tools and the plugins around them. One plugin repo loads into each harness; I do not copy it. [p10ns11y/plugins](https://github.com/p10ns11y/plugins) removed the need to set up agent files here because the harness workflow took care of it. Grok Build loads `.grok-plugin`. cursor-agent, local Cursor, and cloud Cursor load `.cursor-plugin`. Claude Code loads the marketplace in `.claude-plugin/marketplace.json`. [Workflow](workflow.md) says plugins are loaded, not copied. `next dev` writes the agent file again.

[Superdesign](https://superdesign.dev) is the design agent behind the UI. Cursor cloud agents do the build.

After I started steering from Grok Bot, the product moved quickly. 7–8 Oct was mostly agent build time with short human input. A few short sessions of input. Agents built the rest. Grok Bot plus Cursor cloud agents carried it until steering from a phone was easy. The [reference pack](design-refs/REFERENCE-PACK.md) uses Grok Bot as the look of the chat column. It does not record steering. Phone steering stays outside this repo.

Click through the app and you can see:

- A price stays in its own currency. It is not converted.
- A brief is filed only when I press File.

`@adaptate/core` and `@adaptate/utils` are in use. Credits are on the [front page](../README.md#references).

Back: [Work log](worklog.md)

Read next: end
