## Quick start

1. Install Bun

2. Run `bun install`

3. Run `bun --watch api/index.ts`

4. Now you're ready to hit the endpoint

5. Ask @castdrop for SECRET on Warpcast.

6. Run the following URL

```bash
curl --request GET \
  --url 'http://localhost:1337/verify?address=0xbe156227456efcb56fd01037f23b5ca4b13d36c1&verifiedAddresses=0xa081e1da16133bb4ebc7aab1a9b0588a48d15138&verifiedAddresses=0xAa3398CE39BF2De566Ae6200206F5800e946167a' \
  --header 'Castdrop-Secret: SECRET'
```
