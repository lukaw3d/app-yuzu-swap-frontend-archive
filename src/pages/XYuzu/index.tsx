import React, { useCallback, useContext,useRef, useEffect, useMemo, useState } from 'react'
import { ButtonLRTab, ButtonUnderLine } from 'components/Button'
import { XStake } from 'components/XYuzu/XStake'
import { XUnStake } from 'components/XYuzu/XUnStake'
import { ReactChild, ReactNode } from 'hoist-non-react-statics/node_modules/@types/react'
import { useCurrencyBalance ,useCurrencyBalances } from '../../state/wallet/hooks'
import { XYUZU_LIST, blockNumPerS }  from '../../constants'
import { ChainId, CurrencyAmount, JSBI, Token, TokenAmount, StakePool, AttenuationReward, ROUTER_ADDRESS, ZOO_ZAP_ADDRESS, Pair, Currency, WETH } from '@liuxingfeiyu/zoo-sdk'
import { DefaultChainId } from '../../constants/index'
import { useActiveWeb3React } from '../../hooks'
import { useAllTokens, useToken, useIsUserAddedToken, useFoundOnInactiveList } from '../../hooks/Tokens'
import fixFloat,{getTimeStr, transToThousandth} from 'utils/fixFloat'
import QuestionHelper, {AddQuestionHelper, AddQuestionNoCHelper} from 'components/QuestionHelper'
import { useTranslation } from 'react-i18next'
import { useSingleCallResult } from '../../state/multicall/hooks'
import { useTokenContract, useXYuzuContract } from 'hooks/useContract'
import { tokenAmountForshow } from 'utils/ZoosSwap'
import { useSelector } from 'react-redux'
import { AppDispatch, AppState } from '../../state'
import { useMyAllStakePoolList,useMyAllYuzuParkExtList } from 'data/ZooPark'


type Props = {
    show : boolean;
};

const Wrapper : React.FC<Props> = ({show , children})=>(
    
    show?
    <div className="s-xyuzu-tab-wrapper" style={{width:"100%"}}>
        {children}
    </div>
    :
    <div style={{width:"100%"}}>
        {children}
    </div>
    
)

export function XYuzu(){
    const { account, chainId } = useActiveWeb3React()
    const zooPrice:any = useSelector<AppState>(state=>state.zoo.price) || 1
    const {t} = useTranslation()
    const [left , SetLeft] = useState<boolean>(true)
    const tokenlist = useAllTokens()
    const [yuzuToken, xyuzuToken] : (Token | undefined) [] = useMemo(
        ()=>{
            let re = undefined
            let re1 = XYUZU_LIST[chainId ?? DefaultChainId]
            for(let item of Object.values(tokenlist)){
                if(item.symbol == 'YUZU'){
                    re = item
                }
            }
            return [re, re1]
        }
        ,
        [tokenlist]
    )

    const yuzuBalances = useCurrencyBalances(xyuzuToken?.address ?? undefined, 
        [yuzuToken]
    )

    const xyuzuCon = useXYuzuContract(xyuzuToken?.address)
    const circul = useSingleCallResult(xyuzuCon, "totalSupply", []).result 
    const circulShow = transToThousandth(fixFloat(tokenAmountForshow(circul ?? '0', xyuzuToken?.decimals), 3))
    const [poolExtList,extStatics] = useMyAllYuzuParkExtList()
    const xyuzuIndex = useMemo(
        ()=>{
            let re = 0
            if(!poolExtList){
                return re
            }
            for(let i = 0; i<poolExtList.length; i++){
                if(poolExtList[i].token0.address == poolExtList[i].token1.address){
                    re = poolExtList[i].pid
                }
            }
            return re

        },[poolExtList]
    )

    return(
        <div className="s-xyuzu-body">
            <div className="s-xyuzu-header">
                <div>
                    <span className="s-xyuzu-header-banner" >Dual Yield by Locking </span>
                    <span className="s-banner-title">YUZU for xYUZU</span>
                </div>
                <div className="s-xyuzu-header-text1" style={{marginTop:"20px", position:"relative"}}>
                Stake xYUZU in <a style={{cursor:'pointer', textDecoration: 'none'}} href={"#/liquiditymining/select/-1/extselect/"+ xyuzuIndex}>Single Token Staking</a> to mine both YUZU and ROSE at the same time.
                <QuestionHelper text={t("xyuzuhintQ")}/>
                </div>
                <div style={{marginTop:"20px"}} className="s-xyuzu-header-summary">
                    <span className="s-xyuzu-header-text2">
                        YUZU TVL:&nbsp;&nbsp;
                    </span>
                    <span className="s-xyuzu-header-number">
                        ${transToThousandth(fixFloat(parseFloat(yuzuBalances[0]?.toSignificant(6) ?? '0') * zooPrice, 3))}
                    </span>
                    <span className="s-xyuzu-header-text2 s-xyuzu-header-summary-margin">
                        xYUZU Circulation:&nbsp;&nbsp;
                    </span>
                    <span className="s-xyuzu-header-number">
                        {circulShow}
                    </span>
                </div>
            </div>
            <div className="s-xyuzu-tab" style={{marginTop:"40px"}}>
                <Wrapper show={left} >
                    <ButtonLRTab  disabled={left} onClick={()=>SetLeft(true)}>Lock YUZU for xYUZU</ButtonLRTab>
                </Wrapper>
                <Wrapper show={!left}>
                    <ButtonLRTab  disabled={!left} onClick={()=>SetLeft(false)}>Overview</ButtonLRTab>
                </Wrapper>
            </div>
            {
                left ?
                <XStake/> : <XUnStake/>
            }
            <div></div>
        </div>
    )
}