const http = require("http");
const fs = require("fs");
const path = require("path");

const port = process.env.PORT || 3000;

const listings = [
  {
    id: "1",
    title: "Apple MacBook Air M2 13\"",
    category: "Electronics",
    condition: "Used - Like New",
    location: "Colombo",
    shipping: "Free shipping",
    timeLeft: "2h 18m",
    buyNowPrice: 899,
    currentBid: 710,
    image: "https://picsum.photos/seed/laptop/500/320",
    sold: false
  },
  {
    id: "2",
    title: "Vintage Seiko Automatic Watch",
    category: "Collectibles",
    condition: "Pre-owned",
    location: "Kandy",
    shipping: "$12 shipping",
    timeLeft: "5h 02m",
    buyNowPrice: 240,
    currentBid: 120,
    image: "https://picsum.photos/seed/watch/500/320",
    sold: false
  },
  {
    id: "3",
    title: "Nike Air Jordan 1 Retro High",
    category: "Fashion",
    condition: "New with box",
    location: "Galle",
    shipping: "$9 shipping",
    timeLeft: "1d 4h",
    buyNowPrice: 320,
    currentBid: 190,
    image: "https://picsum.photos/seed/shoes/500/320",
    sold: false
  },
  {
    id: "4",
    title: "PlayStation 5 Console Bundle",
    category: "Gaming",
    condition: "Used",
    location: "Jaffna",
    shipping: "$20 shipping",
    timeLeft: "7h 45m",
    buyNowPrice: 610,
    currentBid: 500,
    image: "https://picsum.photos/seed/ps5/500/320",
    sold: false
  },
  {
    id: "5",
    title: "Canon EOS M50 Mirrorless Camera",
    category: "Electronics",
    condition: "Used - Good",
    location: "Negombo",
    shipping: "Free shipping",
    timeLeft: "3d 10h",
    buyNowPrice: 540,
    currentBid: 390,
    image: "https://picsum.photos/seed/camera/500/320",
    sold: false
  },
  {
    id: "6",
    title: "Lego Star Wars Millennium Falcon",
    category: "Toys",
    condition: "New",
    location: "Matara",
    shipping: "$15 shipping",
    timeLeft: "9h 11m",
    buyNowPrice: 180,
    currentBid: 98,
    image: "https://picsum.photos/seed/lego/500/320",
    sold: false
  }
];

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { "Content-Type": "application/json" });
  res.end(JSON.stringify(payload));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString();
    });
    req.on("end", () => {
      if (!body) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error("Invalid JSON"));
      }
    });
    req.on("error", reject);
  });
}

function serveStaticFile(req, res, pathname) {
  const relativePath = pathname === "/" ? "index.html" : pathname.slice(1);
  const resolvedPath = path.join(__dirname, relativePath);

  if (!resolvedPath.startsWith(__dirname)) {
    res.writeHead(403, { "Content-Type": "text/plain" });
    res.end("Forbidden");
    return;
  }

  fs.readFile(resolvedPath, (error, data) => {
    if (error) {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("Not Found");
      return;
    }

    const ext = path.extname(resolvedPath).toLowerCase();
    const contentTypes = {
      ".html": "text/html",
      ".css": "text/css",
      ".js": "application/javascript",
      ".json": "application/json",
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".svg": "image/svg+xml",
      ".webp": "image/webp"
    };

    res.writeHead(200, { "Content-Type": contentTypes[ext] || "text/plain" });
    res.end(data);
  });
}

const server = http.createServer(async (req, res) => {
  const requestUrl = new URL(req.url, `http://${req.headers.host}`);
  const { pathname, searchParams } = requestUrl;

  if (req.method === "GET" && pathname === "/api/listings") {
    const query = (searchParams.get("q") || "").toLowerCase().trim();
    const category = (searchParams.get("category") || "All").toLowerCase();

    const filtered = listings.filter((item) => {
      const matchesQuery = !query || item.title.toLowerCase().includes(query);
      const matchesCategory = category === "all" || item.category.toLowerCase() === category;
      return matchesQuery && matchesCategory;
    });

    sendJson(res, 200, { listings: filtered });
    return;
  }

  if (req.method === "POST" && /^\/api\/listings\/[^/]+\/bid$/.test(pathname)) {
    const id = pathname.split("/")[3];
    const listing = listings.find((item) => item.id === id);

    if (!listing) {
      sendJson(res, 404, { error: "Listing not found" });
      return;
    }

    if (listing.sold) {
      sendJson(res, 400, { error: "This item has already been sold" });
      return;
    }

    try {
      const body = await readBody(req);
      const amount = Number(body.amount);

      if (!Number.isFinite(amount) || amount <= listing.currentBid) {
        sendJson(res, 400, { error: `Bid must be greater than $${listing.currentBid}` });
        return;
      }

      if (amount >= listing.buyNowPrice) {
        sendJson(res, 400, { error: "Use Buy Now for this amount" });
        return;
      }

      listing.currentBid = amount;
      sendJson(res, 200, { message: "Bid placed", listing });
      return;
    } catch {
      sendJson(res, 400, { error: "Invalid request body" });
      return;
    }
  }

  if (req.method === "POST" && /^\/api\/listings\/[^/]+\/buy$/.test(pathname)) {
    const id = pathname.split("/")[3];
    const listing = listings.find((item) => item.id === id);

    if (!listing) {
      sendJson(res, 404, { error: "Listing not found" });
      return;
    }

    if (listing.sold) {
      sendJson(res, 400, { error: "This item has already been sold" });
      return;
    }

    listing.sold = true;
    sendJson(res, 200, { message: "Purchase completed", listing });
    return;
  }

  if (req.method !== "GET") {
    sendJson(res, 405, { error: "Method not allowed" });
    return;
  }

  if (pathname.startsWith("/api/")) {
    sendJson(res, 404, { error: "API endpoint not found" });
    return;
  }

  serveStaticFile(req, res, pathname);
});

server.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});