const { app, BrowserWindow, Menu, ipcMain, shell } = require("electron");
const path = require('path');
const os = require('os');
const fs = require('fs');

const resizeImg = require('resize-img')

let mainWindow


process.env.NODE_ENV = 'production';
const isDev = process.env.NODE_ENV !== "production";
const isMac = process.platform === "darwin";
//create the main window
const createMainWindow = () => {
  mainWindow = new BrowserWindow({
    title: "Image Resizer",
    width: isDev ? 1000 : 500,
    height: 800,
    webPreferences:{
        contextIsolation:true,
        nodeIntegration:true,
        preload: path.join(__dirname, 'preload.js')
    },
    icon : isMac ? "./assets/icons/mac/icon.icns" : "./assets/icons/win/icon.ico",
  });

  // Open devtools if in dev env
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }
  mainWindow.loadFile(path.join(__dirname, "./renderer/index.html"));
};

//create about window
const createAboutWindow = () =>{
    const aboutWindow = new BrowserWindow({
        title: "About Image Resizer",
        width: 300,
        height: 300,
      });

      aboutWindow.loadFile(path.join(__dirname, "./renderer/about.html"));

}




//App is ready
app.whenReady().then(() => {
  createMainWindow();
  // Implement Menu
const mainMenu = Menu.buildFromTemplate(menu);
Menu.setApplicationMenu(mainMenu);
  // remove mainWoindow from memory on cloe

  mainWindow.on('closed', () =>(mainWindow = null));
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

//Menu template
const menu = [
    ...(isMac ? [{
        label : app.name,
        submenu:[
            {
                label: 'About',
                click: createAboutWindow
            },
        ]
    }
    ] 
    : []),
  {
    role : 'fileMenu'
  },
  ...(!isMac ? [{
    label : 'Ayuda',
    submenu:[
        {
            label : "About",
            click: createAboutWindow
        },
    ]
  }] : [])
];

//Response to ipsRenderer resize

ipcMain.on('image:resize', (e, options)=>{
  options.dest = path.join(os.homedir(), 'imageresizer' )
  resizeImage(options)
})

//resize the image
resizeImage = async ({imgPath, width, height, dest, }) =>{
  try {
    const newPath = await resizeImg(fs.readFileSync(imgPath),{
      width: +width,
      height: +height
    });
    //create filename
    const filename = path.basename(imgPath)

    //create dest folder if not exists
    if(!fs.existsSync(dest)){
      fs.mkdirSync(dest)
    }

    // write file to dest

    fs.writeFileSync(path.join(dest, filename), newPath);

    //send success to render
    mainWindow.webContents.send('image:done');

    // Open dest folder
    shell.openPath(dest)
  } catch (error) {
    console.error(error)
  }

}

//Close window
app.on("window-all-closed", () => {
  if (!isMac) {
    app.quit();
  }
});
