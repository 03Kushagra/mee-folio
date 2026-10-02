# Archive

Finished pieces that aren't on the site right now but are kept for later.
Nothing in here is imported by the app, so it isn't included in the build.

## RoleShapesHero

An alternative hero: about 7,000 dots form a picture of whichever role card is in front
(code review, page wireframe, client → API → database, spirograph, growth chart),
sweeping left to right between pictures. The cursor pushes the dots aside.

To try it, in `client/src/App.tsx` replace `<BlueprintHero />` with:

```tsx
import { RoleShapesHero } from "./archive/RoleShapesHero/RoleShapesHero";
// …
<RoleShapesHero />
```

Note: the pictures are designed for landscape screens; they need portrait versions before use on phones.
