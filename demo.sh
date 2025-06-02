cd client
npm run build

cd ../server
npm run build

cd ..
node client/build/index.js server/build/index.js