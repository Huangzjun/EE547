const http = require('http');
const url = require('url');
const fs = require('fs');
const { spawn } = require('child_process');

let requestCount = 0;
let errorCount = 0;

const server = http.createServer((req, res) => {
    requestCount++;
    const parsedUrl = url.parse(req.url, true);
    const path = parsedUrl.pathname;

    if (req.method === 'GET') {
        if (path === '/ping') {
            res.writeHead(204);
            res.end();
            return;
        }

        if (path === '/anagram') {
            const p = parsedUrl.query.p;

            if (!p || !/^[a-zA-Z]+$/.test(p)) {
                res.writeHead(400);
                res.end();
                return;
            }
            
            const pythonProcess = spawn('python3', ['command-line.py', p]);

            let output = '';
            let errorOutput = '';

            pythonProcess.stdout.on('data', (data) => {
                output += data.toString();
            });

            pythonProcess.stderr.on('data', (data) => {
                errorOutput += data.toString();
            });

            pythonProcess.on('close', (code) => {
                if (code !== 0 || errorOutput) {
                    res.writeHead(400);
                    res.end();
                    return;
                }

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ p: p, total: output.trim() }));
            });

            return;
        }

        if (path === '/secret') {
            const secretFilePath = '/tmp/secret.key';
            fs.readFile(secretFilePath, 'utf8', (err, data) => {
                if (err) {
                    res.writeHead(404);
                    res.end();
                    errorCount++;
                } else {
                    res.writeHead(200, { 'Content-Type': 'text/plain' });
                    res.end(data);
                }
            });
            return;
        }

        if (path === '/status') {
            const statusData = {
                time: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
                req: requestCount,
                err: errorCount
            };
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(statusData));
            return;
        }

        res.writeHead(404);
        res.end();
        errorCount++;
    } else {
        res.writeHead(405);
        res.end();
    }
});

server.listen(8088, () => {
    console.log("Server running on port 8088...");
});
