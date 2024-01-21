const express = require("express");
const { exec } = require("child_process");
const multer = require("multer");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());

const PORT = 3000;

// 通过name停止特定进程
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
    res.json({ message: `所有进程保存成功` });
  });
});

// 获取所有进程
app.get("/pm2/jlist", (req, res) => {
  exec("pm2 jlist", (error, stdout, stderr) => {
    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }
    if (stderr) {
      res.status(500).json({ error: stderr });
      return;
    }
    const data = JSON.parse(stdout);
    const out = [];
    for (let i = 0; i < data.length; i++) {
      const item = data[i];
      const env = item.pm2_env;
      if (env.namespace === "custom") {
        out.push({
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
    }
    res.json(out);
  });
});

// 根据name获取特定进程
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

// 通过name启动特定进程
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
    res.json({ message: `进程 ${name} 重启成功` });
  });
});

// 通过name重启特定进程
app.post("/pm2/restart/:name", (req, res) => {
  const { name } = req.params;
  exec(`pm2 restart ${name}`, (error, stdout, stderr) => {
    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }
    if (stderr) {
      res.status(500).json({ error: stderr });
      return;
    }
    res.json({ message: `进程 ${name} 重启成功` });
  });
});

// 通过name停止特定进程
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
    res.json({ message: `进程 ${name} 停止成功` });
  });
});

// 通过name删除特定进程
app.delete("/pm2/delete/:name", (req, res) => {
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
    res.json({ message: `进程 ${name} 删除成功` });
  });
});

// 通过name停止特定进程
app.get("/pm2/logs/:name", (req, res) => {
  const { name } = req.params;
  const { lines } = req.query;
  exec(
    `pm2 logs ${name} --nostream --timestamp --raw --lines ${lines} --namespace custom`,
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

// 启动新上传的脚本
app.post("/pm2/start", (req, res) => {
  const { filename, name, cluster, instances, args } = req.body;
  let script = `pm2 start ./uploads/${filename} --name ${name} --namespace custom`;
  script += cluster ? ` -i ${instances}` : "";
  script += args ? ` -- ${args}` : "";
  exec(script, (error, stdout, stderr) => {
    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }
    if (stderr) {
      res.status(500).json({ error: stderr });
      return;
    }
    res.json({ message: `进程 ${name} 启动成功` });
  });
});

// 设置 Multer 存储引擎，指定上传目录
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // 指定上传文件的存放目录（请确保该目录存在）
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  },
});

const upload = multer({ storage });

// 定义上传 JavaScript 文件的路由
app.post("/pm2/upload", upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).send("没有文件上传");
  }

  try {
    const { originalname, destination } = req.file;
    res.send(`${originalname} 已成功上传至 ${destination}`);
  } catch (error) {
    console.error(error.message);
    res.status(500).send("上传失败，请检查服务器配置或网络连接");
  }
});

app.listen(PORT, () => {
  console.log(`服务器正在运行，端口号为 ${PORT}`);
});
