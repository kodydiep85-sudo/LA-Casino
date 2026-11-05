# Put Grand Squeeze Baccarat online (about 10 minutes, free)

This gives you a normal website, such as `https://grand-squeeze-baccarat.onrender.com`. Anyone can open it and play: solo, at a friend's table, or from the open-tables list. Nobody needs an account.

## Step 1: put the files on GitHub

1. Make a free account at <https://github.com>.
2. Click **+ → New repository**. Name it `grand-squeeze-baccarat`, choose **Public**, then click **Create repository**.
3. On the new repository page, click **uploading an existing file**.
4. Unzip the download, open the folder, select **everything inside it** and drag them in. Don't drag the zip itself or the outer folder.
5. Click **Commit changes**.

## Step 2: turn it into a website on Render

1. Go to <https://render.com> and sign up with your GitHub account.
2. Click **New → Blueprint** and pick your `grand-squeeze-baccarat` repository.
3. Render reads `render.yaml` and fills everything in. Click **Apply** (or **Deploy**).
4. Wait a minute or two for the status to turn **Live**.
5. Your address is shown at the top, ending in `.onrender.com`. Open it, and that's your game.

Share that address with anyone. To play together, one person taps **Start this table with friends**. Everyone else either taps that table in **Open tables**, or enters the 4-letter code and taps **Join**.

## Good to know

- **Sleeping:** on Render's free plan the site sleeps after 15 minutes with nobody on it. The first visitor afterwards waits about a minute while it wakes up. Players at a table keep it awake.
- **Updating the game:** unzip the new download and drag everything inside it into the same GitHub repository (**Add file → Upload files**), then **Commit changes**. Files with the same name are replaced. Render picks them up and redeploys by itself.
- **Start command on Render:** `node server.js` (Settings → Build & Deploy → Start Command). If an old `www` or `server` folder is still in the repository, it's ignored.
- **Your own domain:** in Render, open the service → **Settings → Custom Domains** to use a name like `play.yourname.com`.
- **Store apps:** to point the store apps at this server, put `wss://YOUR-ADDRESS.onrender.com/ws` in the `gs-server` line near the top of `www/index.html`.
