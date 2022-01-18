<!-- CURRENT FEATURES -->
## Current Features

![Product Screen Shot](./README/WebAPP.png)

You are tired of typing urls all the time to go to your apps, the solution is HERE. WebApp a simple solution that only needs to evolve with you

Features:
* Adding app with iframe or not
* Refresh a single application and not the entire site
* Open in other tab without Webapp
* Fast loading with lazy loading
* A single file contains your personal information in clear `config.php`
* No modification is to be made on the DB :smile:



<!-- GETTING STARTED -->
## Getting Started
### Prerequisites

* MariaDB
  ```sh
  apt install sqlite3
  ```
  
* PHP
  ```sh
  apt install php php-sqlite3 
  ```

### Installation

1. Go to folder
   ```sh
   cd /var/www/
   ```
2. Clone the repo
   ```sh
   git clone https://github.com/ProBatou/WebApp.git
   ```
3. Add permision
   ```sh
   chown -R www-data:www-data WebApp/
   ```
4. Go to you're favorite browser and configure WebApp
   ```html
   https://<IPOFDEVICE>
   ```
5. Enjoy and add App in interface
  
  ![Interface Screen Shot](./README/WebAPP%20interface.png)



### Update

Launch `update.sh`
   ```sh
   ./update.sh
   ```
or

Update with interface pop-up 



<!-- CONTACT -->
## Contact

 webapp@probatou.com
