This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Accounts

Curio supports email-and-password sign-up and sign-in. Passwords must be 12-128 characters; they are stored as scrypt hashes, and browser sessions use random, server-validated tokens in HttpOnly cookies.

Profiles and content that existed before password sign-in was added are preserved. Those legacy accounts have no password and cannot sign in until an operator provisions one from an interactive terminal:

```bash
npm run account:provision -- <email>
```

To reset a password that has already been provisioned, add `--reset`. The command prompts for the new password without echoing it and revokes that account's active sessions. Do not put passwords in command arguments or source code.

Email verification, email-based password recovery, and deployment-level rate limiting are not configured yet. Configure and test those controls before opening account registration to the public.

## Discovery

The **For you** feed uses the interests and subjects saved on your profile to gently prioritize matching posts, with community pins first and freshness and conversation as secondary signals. It is deterministic and does not use AI. **Fresh** shows newest posts first (while retaining community pins), **Following** shows followed authors, and the topic chips let you focus or broaden discovery whenever you like.

## Video posts

Post creation accepts MP4 and WebM videos up to 250 MB. The composer checks that a video is no longer than 30 minutes before uploading; the server independently enforces the file-size limit and verifies the container signature, but does not currently verify duration. Video files are stored under `uploads/videos/` on the application server and streamed through authenticated, byte-range-capable routes for playback and seeking.

Keep `uploads/videos/` on persistent storage and back it up alongside `curio.db`. Deployments with ephemeral filesystems or serverless instances need a persistent shared volume; otherwise videos may be unavailable after restarts or across instances. Deleting a post removes its associated video file.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
