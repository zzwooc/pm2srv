const express = require("express");
const { exec } = require("child_process");
const multer = require("multer");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());

const PORT = 3000;

// Get all processes
app.get("/pm2/list", (req, res) => {
  exec("pm2 jlist", (error, stdout, stderr) => {
    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }
    if (stderr) {
      res.status(500).json({ error: stderr });
      return;
    }
    const out = JSON.parse(stdout);
    const data = [];
    for (let i = 0; i < out.length; i++) {
      const item = out[i];
      const env = item.pm2_env;
      data.push({
        id: item.pm_id,
        name: item.name,
        namespace: env.namespace,
        mode: env.exec_mode,
        instances: env.instances,
        uptime: env.pm_uptime,
        created_at: env.created_at,
        restarts: env.restart_time,
        status: env.status,
        cpu: item.monit.cpu,
        mem: item.monit.memory,
        watch: env.watch,
        args: env.args,
        file: env.pm_exec_path.replace(env.pm_cwd, ""),
      });
    }
    res.json(data);
  });
});

// Get process by name
app.get("/pm2/show/:name", (req, res) => {
  const { name } = req.params;
  exec(`pm2 show ${name}`, (error, stdout, stderr) => {
    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }
    if (stderr) {
      res.status(500).json({ error: stderr });
      return;
    }
    res.json(stdout);
  });
});

// Show logs by name
app.get("/pm2/logs/:name", (req, res) => {
  const { name } = req.params;
  const { lines } = req.query;
  exec(
    `pm2 logs ${name} --nostream --timestamp --raw --lines ${lines}`,
    (error, stdout, stderr) => {
      if (error) {
        res.status(500).json({ error: error.message });
        return;
      }
      if (stderr) {
        res.status(500).json({ error: stderr });
        return;
      }
      res.json(stdout);
    }
  );
});

// Save all processes
app.post("/pm2/save", (req, res) => {
  exec(`pm2 save --force`, (error, stdout, stderr) => {
    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }
    if (stderr) {
      res.status(500).json({ error: stderr });
      return;
    }
    res.json({ message: `All processes saved` });
  });
});

// Start process by name
app.post("/pm2/start/:name", (req, res) => {
  const { name } = req.params;
  exec(`pm2 start ${name}`, (error, stdout, stderr) => {
    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }
    if (stderr) {
      res.status(500).json({ error: stderr });
      return;
    }
    res.json({ message: `${name} started` });
  });
});

// Stop process by name
app.post("/pm2/stop/:name", (req, res) => {
  const { name } = req.params;
  exec(`pm2 stop ${name}`, (error, stdout, stderr) => {
    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }
    if (stderr) {
      res.status(500).json({ error: stderr });
      return;
    }
    res.json({ message: `${name} stopped` });
  });
});

// Delete process by name
app.delete("/pm2/del/:name", (req, res) => {
  const { name } = req.params;
  exec(`pm2 delete ${name}`, (error, stdout, stderr) => {
    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }
    if (stderr) {
      res.status(500).json({ error: stderr });
      return;
    }
    res.json({ message: `${name} deleted` });
  });
});

// Set multer storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./uploads/");
  },
  filename: function (req, file, cb) {
    cb(null, `${Date.now()}_${file.originalname}`);
  },
});
const upload = multer({ storage });

// Upload zip file and start
app.post("/pm2/create", upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).send("No file uploaded");
  }

  const filepath = req.file.path;
  const destpath = filepath.replace(".zip", "");
  exec(`unzip -oq ${filepath} -d ${destpath}`, (error, stdout, stderr) => {
    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }
    if (stderr) {
      res.status(500).json({ error: stderr });
      return;
    }

    exec(
      `cd ${destpath} && pm2 start pm2.config.js`,
      (error, stdout, stderr) => {
        if (error) {
          res.status(500).json({ error: error.message });
          return;
        }
        if (stderr) {
          res.status(500).json({ error: stderr });
          return;
        }
        res.json({ message: `uploaded and started` });
      }
    );
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
