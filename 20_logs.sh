#!/bin/sh

echo スクリプトのあるディレクトリに移動
cd `dirname $0`

echo ■ ログを取得
echo "■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■ taskmd-postgres"

CID=$(sudo docker ps -aq --filter "name=taskmd-postgres" --latest)
# sudo docker logs -f --tail=200 -t "$CID"
sudo docker logs --tail=330 -t "$CID"

echo "■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■ taskmd-meilisearch"

CID=$(sudo docker ps -aq --filter "name=taskmd-meilisearch" --latest)
# sudo docker logs -f --tail=200 -t "$CID"
sudo docker logs --tail=30 -t "$CID"



echo "■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■ taskmd-server"

CID=$(sudo docker ps -aq --filter "name=taskmd-server" --latest)
# sudo docker logs -f --tail=200 -t "$CID"
sudo docker logs --tail=30 -t "$CID"




echo "■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■ taskmd-web"

CID=$(sudo docker ps -aq --filter "name=taskmd-web" --latest)
# sudo docker logs -f --tail=200 -t "$CID"
sudo docker logs --tail=30 -t "$CID"

