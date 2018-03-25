# LibertyEngine-Lastorder Fork
[![Build Status](https://travis-ci.org/librewiki/liberty-engine.svg?branch=master)](https://travis-ci.org/librewiki/liberty-engine)

리버티엔진 개발이 영 마음에 안들어서 만든 포크

## Table of Contents
- [Requirements](#requirements)
- [Installation (Ubuntu / Debian)](#installation-ubuntu-debian)
- [Installation (CentOS)](#installation-centos)
- [Start](#start)
- [Stop](#stop)
- [Upgrade](#upgrade)
- [Development](#development)
- [TODO](#todo)

## Requirements
- Git
- 8.x LTS version of Node.js
- MariaDB version 10+
  - Mroonga storage engine for fulltext search.
- Nginx or Apache(Installer only supports Nginx on Ubuntu)
- Redis (optional)

## Installation (Ubuntu / Debian)
```bash
# install dependencies
sudo apt update
sudo apt install mariadb-server
sudo apt install mariadb-plugin-mroonga
sudo apt install nginx
curl -sL https://deb.nodesource.com/setup_8.x | sudo -E bash -
sudo apt install nodejs
# install LibertyEngine
git clone https://github.com/librewiki/liberty-engine.git
cd liberty-engine
npm i
npm run setup
```

## Installation (CentOS)
NOTE: Untested yet!

### Install MariaDB 10.x
CentOS's MariaDB's version is 5.x, so you should add repo to install MariaDB 10+ at CentOS.

#### Step 1.Remove MariaDB/MySQL 5.x (If installed)
```bash
yum remove mariadb-server mysql-server
```

#### Step 2. Create Repo file
Use [This link](https://downloads.mariadb.org/mariadb/repositories) to create repofile.
Below are some examples

**CentOS 7 x86_64**
```
# MariaDB 10.1 CentOS repository list - created 2018-03-24 12:05 UTC
# http://downloads.mariadb.org/mariadb/repositories/
[mariadb]
name = MariaDB
baseurl = http://yum.mariadb.org/10.1/centos7-amd64
gpgkey=https://yum.mariadb.org/RPM-GPG-KEY-MariaDB
gpgcheck=1
```

**CentOS 6 x86_64**
```
# MariaDB 10.1 CentOS repository list - created 2018-03-24 12:05 UTC
# http://downloads.mariadb.org/mariadb/repositories/
[mariadb]
name = MariaDB
baseurl = http://yum.mariadb.org/10.1/centos6-amd64
gpgkey=https://yum.mariadb.org/RPM-GPG-KEY-MariaDB
gpgcheck=1
```

**CentOS 6 x86**
```
# MariaDB 10.1 CentOS repository list - created 2018-03-24 12:21 UTC
# http://downloads.mariadb.org/mariadb/repositories/
[mariadb]
name = MariaDB
baseurl = http://yum.mariadb.org/10.1/centos6-x86
gpgkey=https://yum.mariadb.org/RPM-GPG-KEY-MariaDB
gpgcheck=1
```

Save to `/etc/yum.repos.d/MariaDB.repo`

#### Step 3. Install MariaDB
```bash
sudo yum install MariaDB-server MariaDB-client
```

### Install MariaDB Mroonga Plugin
```bash
sudo yum install -y https://packages.groonga.org/centos/groonga-release-1.4.0-1.noarch.rpm
sudo systemctl start mariadb
sudo yum install -y --enablerepo=epel mariadb-10.1-mroonga
```

### Install Nginx and enable server block file
#### Step 1. Add nginx repo
**CentOS 7**
```bash
sudo rpm -Uvh http://nginx.org/packages/centos/7/noarch/RPMS/nginx-release-centos-7-0.el7.ngx.noarch.rpm
```

**CentOS 6**
```bash
sudo rpm -Uvh http://nginx.org/packages/centos/6/noarch/RPMS/nginx-release-centos-6-0.el6.ngx.noarch.rpm
```

#### Step 2. Install Nginx & Configure server block
```bash
sudo yum install nginx
sudo mkdir /etc/nginx/sites-available
sudo mkdir /etc/nginx/sites-enabled
```

Add following two lines at end of `http {}` block at `nginx.conf` file
(Usually after `include /etc/nginx/conf.d/*.conf;`)
```nginx
include /etc/nginx/sites-enabled/*.conf;
server_names_hash_bucket_size 64;
```

### Install Node.JS
```bash
curl -sL https://deb.nodesource.com/setup_8.x | sudo -E bash -
sudo apt install nodejs
```

### Install and setup LibertyEngine
```bash
git clone https://github.com/librewiki/liberty-engine.git
cd liberty-engine
npm i
npm run setup
```

## Start
```bash
npm start
```

## Stop
```bash
npm stop
```

## Upgrade
```bash
git pull
npm run upgrade
```

## Development
```bash
npm run dev # runs API development server at http://localhost:3001
```
