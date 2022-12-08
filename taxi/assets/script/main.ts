// Learn cc.Class:
//  - [Chinese] http://docs.cocos.com/creator/manual/zh/scripting/class.html
//  - [English] http://www.cocos2d-x.org/docs/creator/en/scripting/class.html
// Learn Attribute:
//  - [Chinese] http://docs.cocos.com/creator/manual/zh/scripting/reference/attributes.html
//  - [English] http://www.cocos2d-x.org/docs/creator/en/scripting/reference/attributes.html
// Learn life-cycle callbacks:
//  - [Chinese] http://docs.cocos.com/creator/manual/zh/scripting/life-cycle-callbacks.html
//  - [English] http://www.cocos2d-x.org/docs/creator/en/scripting/life-cycle-callbacks.html

import { _decorator, Component, Label, Node, director, assetManager } from "cc";
// import { updateValueLabel } from "./ui/common/updateValueLabel";
import { localConfig } from "./framework/localConfig";
import { playerData } from "./framework/playerData";
import { configuration } from "./framework/configuration";
import { audioManager } from "./framework/audioManager";
import { constant } from "./framework/constant";
// import { gameLogic } from "./logic/gameLogic"
import { loading } from "./ui/common/loading";
import { i18n } from "./i18nMaster/runtime-scripts/LanguageData";
import { ethers, BigNumber, utils } from "../lib/ethers/ethers-5.2.esm.min.js";
import ethersHelper from "./framework/ethersHelper";
import { uiManager } from "./framework/uiManager";

const { ccclass, property } = _decorator;

// cc.gameSpace = {};
// cc.gameSpace.TIME_SCALE = 1;
// cc.gameSpace.isStop = false;
// cc.gameSpace.isConfigLoadFinished = false;
i18n.init('en');

@ccclass("main")
export class main extends Component {
    /* class member could be defined like this */
    // dummy = '';

    @property(Label)
    lbVersion: Label = null!;

    @property(loading)
    loadingUI: loading = null!;

    @property(Node)
    buttonMetaMask: Node = null!;

    retryTimes: number = 0;
    uid: string = '';
    curProgress: number = 0;
    isLoginFinished: boolean = false;
    isSubPackageFinished: boolean = false;
    isConfigLoaded: boolean = false;
    isWalletFinished: boolean = false;

    start() {
        // profiler.hideStats();

        this.loadingUI.show();

        //TODO 后续将由服务器提供时间
        playerData.instance.syncServerTime(Date.now());

        // Your initialization goes here.
        this.curProgress = 5; //起始10%
        this.loadingUI.updateProgress(this.curProgress, i18n.t("main.dataLoading"));

        this.buttonMetaMask.active = false
        localConfig.instance.loadConfig(() => {
            // cc.gameSpace.isConfigLoadFinished = true;

            this.lbVersion.string = `Version. ${localConfig.instance.getVersion()}`;
            this.isConfigLoaded = true;
            this.loadMainScene();
            this.buttonMetaMask.active = true
            // connet to wallet
            this.buttonMetaMask.on(Node.EventType.TOUCH_END, this.conectMetaMask, this)
        });


        this.curProgress += 5;
        if (this.loadingUI) {
            this.loadingUI.updateProgress(this.curProgress, i18n.t("main.dataLoadOver"));
        }

        this.curProgress += 5;
        // this.loadingUI.updateProgress(this.curProgress, '登录中...');
        //其他环境下，直接开始加载资源
        this.curProgress += 15;
        this.loadingUI.updateProgress(this.curProgress, i18n.t("main.gameResourceLoading"));

        //普通用户登录
        playerData.instance.loadGlobalCache();
        if (!playerData.instance.userId) {
            //需要创建个账号
            this.uid = configuration.generateGuestAccount();
        } else {
            this.uid = playerData.instance.userId;
        }

        this.startLogin();

        this.downloadGameRes(() => {
            // console.log('subpackage download finished!');
            this.isSubPackageFinished = true;
            this.loadMainScene();
        })

    }

    private conectMetaMask() {
        uiManager.instance.showDialog('common/connetingWallet');
        this.buttonMetaMask.active = false
        ethersHelper.instance.conectMetaMask()
            .then(() => {
                this.isWalletFinished = true
                this.loadMainScene();
                uiManager.instance.hideDialog('common/connetingWallet');
            }).catch((err) => {
                console.error(err)
                this.buttonMetaMask.active = true;
                uiManager.instance.hideDialog('common/connetingWallet');
            });
    }

    startLogin() {
        configuration.instance.setUserId(this.uid);

        playerData.instance.syncServerTime(Date.now());
        this.userLogin();
    }

    userLogin() {
        playerData.instance.loadFromCache();

        if (playerData.instance.playerInfo.createDate === undefined) {
            //表示没有创建过
            playerData.instance.createPlayerInfo();
        }

        console.log('login finished!');
        this.isLoginFinished = true;
        this.loadMainScene();

    }

    downloadGameRes(cb?: Function) {
        //不用加载子包，直接+30
        this.curProgress += 15;
        this.loadingUI.updateProgress(this.curProgress);

        cb && cb();
    }

    showSubPackageError() {

    }

    loadGameSubPackage(cb?: Function) {
        this.loadingUI.updateProgress(this.curProgress, i18n.t("main.audioResourceLoading"));
        assetManager.loadBundle('resources', (err) => {
            this.curProgress += 5;
            this.loadingUI.updateProgress(this.curProgress, i18n.t("main.audioResourceLoading"));
            if (err) {
                this.showSubPackageError();
                return console.error(err);
            }

            assetManager.loadBundle('textures', (err) => {
                this.curProgress += 5;
                this.loadingUI.updateProgress(this.curProgress, i18n.t("main.mappingResourceLoading"));
                if (err) {
                    this.showSubPackageError();
                    return console.error(err);
                }

                assetManager.loadBundle('model', (err) => {
                    this.curProgress += 5;
                    this.loadingUI.updateProgress(this.curProgress, i18n.t("main.modelResourceLoading"));
                    if (err) {
                        this.showSubPackageError();
                        return console.error(err);
                    }

                    cb && cb();
                });
            });
        });
    }

    loadMainScene() {
        if (!this.isConfigLoaded || !this.isLoginFinished || !this.isSubPackageFinished || !this.isWalletFinished) {
            //配置，子包，登录，三项没有加载成功的话要等下一项
            return;
        }

        director.preloadScene('main', (err) => {
            this.curProgress += 5;
            this.loadingUI.updateProgress(this.curProgress, i18n.t("main.entering"));
            if (!err) {
                director.loadScene('main', function () {

                });
            }
        });
    }
}
