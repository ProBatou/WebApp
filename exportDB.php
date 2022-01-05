<?php
// The filename to configure db
require('config.php');

//sql connection
$link_sqli = mysqli_connect($host, $user, $password, $dbname);

// The name of data table containing the data you wish to export
$TableName = "WebApp"; 

// The filename you want your export file to be named
$Filename = "WebApp"; 



// Fetch records from the database table specified in the variable $TableName
$Output = "";
$strSQL = "SELECT * FROM $TableName";
$sql = mysqli_query($link_sqli, $strSQL); 

// If the database query encounters an error, display the error message.
// Otherwise, start the export process.
if (mysqli_error($link_sqli)) { 
echo mysqli_error($link_sqli);
} else {
// Determine the number of data columns in the table
$columns_total = mysqli_num_fields($sql);

// Get the name of the data columns so it can be used in the header row of the export file.
// Content of the export file is temporarily saved in the variable $Output
for ($i = 0; $i < $columns_total; $i++) {
  $Heading = mysqli_fetch_field_direct($sql, $i);
  $Output .= '"' . $Heading->name . '",';
}
$Output .= "\n";		
// The /n is the control code to go to a new line in the export file.

// Loop through each record in the table and read the data value from each column.
while ($row = mysqli_fetch_array($sql)) {
  for ($i = 0; $i < $columns_total; $i++) {
     $Output .= '"' . $row["$i"] . '",';
  }
  $Output .= "\n";
}

// Create the export file and name it with the name specified in variable $Filename
$TimeNow = date("_d_m_Y");
$Filename .= $TimeNow . ".csv";
header('Content-type: application/csv');
header('Content-Disposition: attachment; filename=' . $Filename);
echo $Output;
}
exit;
?>










