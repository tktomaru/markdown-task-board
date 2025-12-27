#!/bin/sh
echo ■ コンテナを停止

sudo docker compose -f docker-compose.yml down

echo ■ データディレクトリを削除
sudo rm -rf ./docker/*

echo ■ 完了
