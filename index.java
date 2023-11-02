package com.carsync;

import com.carsync.utils.BuyListHelper;
import com.carsync.utils.GoogleSpreadsheetHelper;
import com.opencsv.CSVReader;
import com.opencsv.CSVReaderBuilder;
import com.opencsv.RFC4180Parser;
import com.opencsv.RFC4180ParserBuilder;
import org.openqa.selenium.By;
import org.openqa.selenium.JavascriptExecutor;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.chrome.ChromeDriver;
import org.openqa.selenium.chrome.ChromeOptions;
import org.openqa.selenium.interactions.Actions;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.openqa.selenium.support.ui.WebDriverWait;
import org.quartz.Job;
import org.quartz.JobExecutionContext;

import java.io.File;
import java.io.FileOutputStream;
import java.io.FileReader;
import java.io.IOException;
import java.net.URL;
import java.nio.channels.Channels;
import java.nio.channels.ReadableByteChannel;
import java.security.GeneralSecurityException;
import java.sql.SQLException;
import java.time.Duration;
import java.util.*;

import static com.carsync.Constants.msToString;
import static com.carsync.Constants.outputDateTimeFormatter;
import static com.carsync.utils.BuyListHelper.sortByValue;

/**
 * This code is a Java program that fetches a CSV file from a website, performs various operations on the file, and writes the results to a Google spreadsheet.
 */

public class FetchCopartCSV implements Job {



    private static final WebDriver driver;
    private static final JavascriptExecutor js;
    private static final String fileName = "C:\\Users\\owner\\Downloads\\salesdata.csv";
    public static final List<String[]> copartList = new ArrayList<>();

    public static String[] copartHeaders;
    private static final boolean useLocalDataFile = false;

    static {
        //ChromeOptions options = new ChromeOptions();
        Constants.setChromeDriverPath();
        ChromeOptions options = new ChromeOptions();
        // to hide the chrome window
        // options.addArguments("headless");
        options.addArguments("--remote-allow-origins=*","ignore-certificate-errors");
        driver = new ChromeDriver(options);
        js = (JavascriptExecutor) driver;

        try { // This Try Catch Block is outDated <!!!!!!!!!!!!!!! OUTDATED!!!!!!!!!!!!!!?
            readCSV(null);
        } catch (IOException e) {
            e.printStackTrace();
        }//    </!!!!!!!!!!!!!!! OUTDATED!!!!!!!!!!!!!!>

    }


    /**
     * This method logs in to the website and downloads the csv file
     * @throws IOException this is checked to prevent crashes when or if the file is present or not
     * @throws SQLException This was implemented due to the call made to the LowKBBTest file.
     */
    public static void main(String[] args) throws IOException, SQLException {

        String startTime = Constants.dbDateTimeFormatter.format(new Date());
        long start = System.currentTimeMillis();

        File file;

        try {

            if (!useLocalDataFile) {

                String url = "https://www.copart.com/downloadSalesData/";
                WebDriverWait webDriverWait = new WebDriverWait(driver, Duration.ofSeconds(10)); // changed by masud

                driver.get(url);

                webDriverWait.until(ExpectedConditions.presenceOfElementLocated(By.id("username")));

                driver.findElement(By.id("username")).sendKeys("tedpenner@gmail.com");
                driver.findElement(By.id("password")).sendKeys("Tpadmin.1");

                driver.findElement(By.cssSelector("button[data-uname=\"loginSigninmemberbutton\"]")).click();

                //new Scanner(System.in).nextLine();
                try {
                    webDriverWait.until(ExpectedConditions.presenceOfElementLocated(By.cssSelector("button[ng-click=\"downloadCSV()\"]")));
                } catch (Exception ignored) {
                    try {
                        driver.findElement(By.id("username")).sendKeys("tedpenner@gmail.com");
                        driver.findElement(By.id("password")).sendKeys("Tpadmin.1");

                        driver.findElement(By.cssSelector("button[data-uname=\"loginSigninmemberbutton\"]")).click();
                    } catch (Exception ignored1) {
                    }
                    webDriverWait.until(ExpectedConditions.urlContains("dashboard"));
                    driver.get(url);
                }
                // new Scanner(System.in).nextLine();

                webDriverWait.until(ExpectedConditions.presenceOfElementLocated(By.cssSelector("button[ng-click=\"downloadCSV()\"]")));

                WebElement element = driver.findElement(By.cssSelector("button[ng-click=\"downloadCSV()\"]"));

                Actions actions = new Actions(driver);
                actions.moveToElement(element);
                actions.perform();

                //element.click();
                js.executeScript("document.querySelector('button[ng-click=\"downloadCSV()\"]').click();");

                Thread.sleep(2000);

                driver.get("chrome://downloads/");

                JavascriptExecutor jsExecutor = (JavascriptExecutor) driver;

                jsExecutor.executeScript("""
                        const docs = document
                          .querySelector('downloads-manager')
                          .shadowRoot.querySelector('#downloadsList')
                          .getElementsByTagName('downloads-item')[0].shadowRoot.querySelector("#url").href;
                                var newdiv = document.createElement('DIV');        newdiv.id = 'onEnter';        newdiv.value = docs;        newdiv.style.display = 'none';        document.body.appendChild(newdiv);  console.log(docs)""");

                jsExecutor.executeScript("document.querySelector('downloads-manager').shadowRoot.querySelector('#downloadsList')\n" +
                        ".getElementsByTagName('downloads-item')[0].shadowRoot.querySelector('cr-button[focus-type=\"cancel\"]').click()");

                WebDriverWait wait = new WebDriverWait(driver, Duration.ofSeconds(20)); // changed by masud
                wait.until(ExpectedConditions.presenceOfElementLocated(By.id("onEnter")));

                jsExecutor.executeScript("const docs = document\n" +
                        "  .querySelector('downloads-manager')\n" +
                        "  .shadowRoot.querySelector('#downloadsList')\n" +
                        //"  .getElementsByTagName('downloads-item')[0].shadowRoot.querySelector(\"cr-button[focus-type=\ncancel\"]\").href;\n" +
                        "\n" +
                        "        var newdiv = document.createElement('DIV');" +
                        "        newdiv.id = 'onEnter';" +
                        "        newdiv.value = docs;" +
                        "        newdiv.style.display = 'none';" +
                        "        document.body.appendChild(newdiv);" +
                        "  console.log(docs)");

                String downloadLink = driver.findElement(By.id("onEnter")).getAttribute("value");

                System.out.println(downloadLink);

                // Check funtionality
                ((JavascriptExecutor) driver).executeScript("document.getElementById('onEnter').remove()");

                driver.quit();

                ReadableByteChannel readableByteChannel = Channels.newChannel(new URL(downloadLink).openStream());

                //File file = new File(fileName);
                file = File.createTempFile("Data" + System.currentTimeMillis(), "csv");

                file.deleteOnExit();
                FileOutputStream fileOutputStream = new FileOutputStream(file);
                //FileOutputStream fileOutputStream = new FileOutputStream(fileName,false);
                // FileChannel fileChannel = fileOutputStream.getChannel();

                fileOutputStream.getChannel()
                        .transferFrom(readableByteChannel, 0, Long.MAX_VALUE);

                fileOutputStream.close();
            } else {
                file = new File(fileName);
            }

//            boolean delete = file.delete();
//
//            // Wait for file to get deleted properly
//            Thread.sleep(5000);
//
//            System.out.println("File deleted - " + delete);


            System.out.println("CSV File downloaded");

            readCSV(file);

            boolean delete = false;

            if (!useLocalDataFile)
                delete = file.delete();

            System.out.println("File deleted - " + delete);

            // 20 seconds

            // This will take more than 2 minutes but its irrelevant to buylist sheet and will be done in background
            //CopartDBInsertionThread thread = new CopartDBInsertionThread();
            //thread.start();
        } catch (Exception e) {
            e.printStackTrace();
            System.out.println("Resumed");
            //driver.quit();
        }
        /*Comments from Deepak These four processes need are part of the Gsheet run configuation */
        //new Scanner(System.in).nextLine();
        // 1 minute
        CSVImporter.main(null);

        // So that LowKBBTest can read the latest vehicles that we imported in previous step
        // Update by Deepak. Export to spreadsheet is no more needed
        // CSVExporter.main(null);

        // Depends upon how many new vehicle are there per vehicle approx 5 seconds
        LowKBBTest.main(null);

        // Less than 30 seconds
        // No more needed.
        // CSVExporter.main(null);

        System.out.println(copartList.size());

        HashMap<String,HashMap<String,Integer>> countMap = new HashMap<>();

        for (String[] row : copartList) {
            String company = BuyListHelper.getColumnValue(row,"AUCTION_COMPANY");
            String location = BuyListHelper.getColumnValue(row,"LOCATION_CITY");

            HashMap<String, Integer> map = countMap.getOrDefault(company, new HashMap<>());

            Integer c = map.getOrDefault(location, 0);
            map.put(location,++(c));

            countMap.put(company,map);
        }

        StringBuilder buffer = new StringBuilder();

        buffer.append("Total Records - ").append(copartList.size()).append("\n\n");

        for (String company : countMap.keySet()) {
            int count = 0;
            StringBuilder tempBuff= new StringBuilder();
            HashMap<String, Integer> map = countMap.get(company);
            map = sortByValue(map);
            for (String location : map.keySet()) {

                int size = map.get(location);
                count+=size;
                tempBuff.append(location).append(" (").append(size).append(") ");

            }

            buffer.append(company).append(" (").append(count).append(") - ");
            buffer.append(tempBuff).append('\n');
        }

        System.out.println(buffer);

        // Total time can be around 5 - 10 minutes maximum

        String endTime = Constants.dbDateTimeFormatter.format(new Date());

        // Write these time to google sheet

        String[] times = {"com.cars.buyllist.scheduling", "BuyListDataJob", "Automatic", "Hourly", startTime, endTime, "BuyList Updated with " + CSVImporter.success + " new vehicles\n"+buffer};

        try {
            long milliseconds = System.currentTimeMillis() - start;
            long minutes = (milliseconds / 1000) / 60;
            long seconds = (milliseconds / 1000) % 60;
            System.out.format("The process that updates the Car List at https://tpcarlist.com completed successfully in %dm:%ds on %s.\nThe time and status details have been saved to this document https://docs.google.com/spreadsheets/d/1cs-MOezRKLVeeaC96XW5Dk7cBcST9TdtDZQ1Rg3TVzc/edit?usp=sharing.\nThe code that initiated this update process is now in wait mode and can be manually halted at any time, or left alone to continue running at 10 a.m. daily.\n"
                    , minutes, seconds, Constants.outputDateTimeFormatter.format(new Date()));
            GoogleSpreadsheetHelper.writeTimeStats(times);
        } catch (GeneralSecurityException e) {
            e.printStackTrace();
        }


    }


    /** downloaded by the main method
     * reads the csv file downloaded
     */
    private static void readCSV(File file) throws IOException {
        RFC4180Parser rfc4180Parser = new RFC4180ParserBuilder().build();

        FileReader fileReader;
        if (file == null) {
            System.out.println("Entering in the code and soon I will get an exception");
            fileReader = new FileReader(fileName);
        } else {
            fileReader = new FileReader(file);
        }

        System.out.println("Entering in the code and soon I will get an exception");
        CSVReaderBuilder csvReaderBuilder = new CSVReaderBuilder(fileReader).withCSVParser(rfc4180Parser);
        CSVReader reader = csvReaderBuilder.build();

        copartHeaders = reader.readNext();

        copartList.clear();

        String[] row;
        while ((row = reader.readNext()) != null) {
            // Skip processing the last line
            if (reader.peek() != null) {
                // Process the row (you can add your processing logic here)
                copartList.add(row);
            }
        }

        fileReader.close();
        reader.close();
    }


    /**
     * runs the main thread
     * @param jobExecutionContext accepts a job execution context as parameter
     */
    @Override
    public void execute(JobExecutionContext jobExecutionContext) {
        try {
            long start = System.currentTimeMillis();

            main(null);

            String endDate = outputDateTimeFormatter.format(new Date());
            long end = System.currentTimeMillis();

            /*System.out.println("Copart process finished in "+msToString(end-start)+" on "+endDate+"");*/
        } catch (IOException | SQLException findFailed) {
            findFailed.printStackTrace();
        }
    }
}