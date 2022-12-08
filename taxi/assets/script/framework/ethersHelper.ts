import { BigNumber, ethers } from "../../lib/ethers/ethers-5.2.esm.min.js";
import { localConfig } from "./localConfig";

export default class ethersHelper {
    private static _instance: ethersHelper;
    static get instance() {
        if (this._instance) {
            return this._instance;
        }

        this._instance = new ethersHelper();
        return this._instance;
    }
    provider = null
    signer = null
    erc20 = null
    carNft = null
    signerAddress = ""
    datas = {
        gold: 0,
        cars: {},
    }


    conectMetaMask(): Promise<any> {
        const etherConfig = localConfig.instance.ethers;
        //@ts-ignore
        const provider = new ethers.providers.Web3Provider(window.ethereum)
        this.provider = provider;
        return provider.send("eth_requestAccounts", []).then(() => {
            const signer = provider.getSigner(undefined)
            this.signer = signer
            console.info("signer", signer)
            return signer.getAddress()
        }).then((signerAddress) => {
            this.signerAddress = signerAddress
            this.erc20 = new ethers.Contract(etherConfig.erc20Adrees, etherConfig.erc20abi, this.signer)
            this.carNft = new ethers.Contract(etherConfig.carNftAdress, etherConfig.carNftabi, this.signer);
            console.info("signerAddress", signerAddress, "erc20", this.erc20, "carNft", this.carNft)
            const promises = [this.queryGold(), this.queryCars()]
            return Promise.all(promises)
        })
    }

    queryGold(): Promise<any> {
        return this.erc20.balanceOf(this.signerAddress)
            .then((balanceOf: BigNumber) => {
                console.info("queryGold balanceOf", balanceOf)
                this.datas.gold = ethers.utils.formatEther(balanceOf)
                return true
            })
    }

    queryCar(id: number): Promise<any> {
        return this.carNft.balanceOf(this.signerAddress, id)
            .then((balanceOf: BigNumber) => {
                console.info("queryCar balanceOf", balanceOf)
                this.datas.cars[id] = ethers.utils.formatEther(balanceOf)
                return true
            })
    }

    queryCars(): Promise<any> {
        const arrCars = localConfig.instance.getCars();
        const accounts = [], ids = []
        arrCars.forEach((v) => {
            ids.push(v.ID)
            accounts.push(this.signerAddress)
        })
        return this.carNft.balanceOfBatch(accounts, ids)
            .then((balanceOfBatch: BigNumber[]) => {
                console.info("queryCars balanceOfBatch", balanceOfBatch)
                balanceOfBatch.forEach((v, i) => {
                    this.datas.cars[ids[i]] = ethers.utils.formatEther(v)
                })
                return true
            })
    }

    rewardOver(rewardMoney: number | string): Promise<any> {
        return this.erc20.smint(ethers.utils.parseEther(`${rewardMoney}`))
            .then((smint) => {
                console.info("smint", smint)
                return smint.wait()
            })
    }

    buyCar(id: number): Promise<any> {
        const etherConfig = localConfig.instance.ethers;
        return this.erc20.approve(etherConfig.carNftAdress, ethers.constants.MaxUint256)
            .then(() => {
                return this.carNft.buyCar(id)
            }).then((buycar) => {
                console.info("buycar", buycar)
                return buycar.wait()
            }).then((wait) => {
                this.datas.cars[id]++
                console.info("wait", wait)
                return id
            })
    }

}