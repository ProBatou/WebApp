<?php
use Phppot\DataSource;

require_once 'DataSource.php';
$db = new DataSource();
$conn = $db->getConnection();

if (isset($_POST["import"])) {
    
    $fileName = $_FILES["file"]["tmp_name"];
    
    if ($_FILES["file"]["size"] > 0) {
        
        $file = fopen($fileName, "r");
        
        while (($column = fgetcsv($file, 10000, ",")) !== FALSE) {
            
            $userId = "";
            if (isset($column[0])) {
                $userId = mysqli_real_escape_string($conn, $column[0]);
            }
            $userName = "";
            if (isset($column[1])) {
                $userName = mysqli_real_escape_string($conn, $column[1]);
            }
            $password = "";
            if (isset($column[2])) {
                $password = mysqli_real_escape_string($conn, $column[2]);
            }
            $firstName = "";
            if (isset($column[3])) {
                $firstName = mysqli_real_escape_string($conn, $column[3]);
            }
            $lastName = "";
            if (isset($column[4])) {
                $lastName = mysqli_real_escape_string($conn, $column[4]);
            }
            
            $sqlInsert = "INSERT into WebApp (Id,Nom,Lien,Ordre,Frame)
                   values (?,?,?,?,?)";
            $paramType = "issss";
            $paramArray = array(
                $userId,
                $userName,
                $password,
                $firstName,
                $lastName
            );
            $insertId = $db->insert($sqlInsert, $paramType, $paramArray);
            
            if (! empty($insertId)) {
                $type = "success";
                $message = "CSV Data Imported into the Database";
            } else {
                $type = "error";
                $message = "Problem in Importing CSV Data";
            }
        }
    }
}
?>
<!DOCTYPE html>
<html>

<head>

</head>

<body>
    <h2>Import CSV file into Mysql using PHP</h2>


            <form class="form-horizontal" action="" method="post" name="frmCSVImport" id="frmCSVImport" enctype="multipart/form-data">
                    <input type="file" name="file" id="file" accept=".csv">
                    <button type="submit" id="submit" name="import" class="btn-submit">Import</button>
            </form>


</body>

</html>


