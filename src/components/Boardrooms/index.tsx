import React,{ useContext, useMemo, useRef, useReducer, useState, useEffect} from 'react'
import styled from 'styled-components'
import { CardProps, Text } from 'rebass'
import QuestionHelper, {LightQuestionHelper}  from '../QuestionHelper'
import { Box } from 'rebass/styled-components'
import { Link } from 'react-router-dom'

import { ButtonPrimaryNormal, ButtonSecondary, ButtonPrimary, ButtonShowDetail } from '../../components/Button'

import EthereumLogo from '../../assets/images/ethereum-logo.png'
import FantomLogo from '../../assets/images/fantom-logo.png'
import Trans from '../../assets/newUI/trans.png'
import DoublegetIcon from '../../assets/images/doubleget2.png'
import WebLinkJump from '../../assets/images/web-link.png'
import { DefaultChainId, xyuzuExtBlock, XYUZU_LIST, ZOO_PARK_ADDRESS } from '../../constants'
import { useActiveWeb3React } from 'hooks'
import { STAKING_REWARDS_INTERFACE } from 'constants/abis/staking-rewards'
import { useMultipleContractSingleData } from 'state/multicall/hooks'
//import { ZERO } from '@liuxingfeiyu/zoo-sdk//constants'
import useTransactionDeadline from 'hooks/useTransactionDeadline'
import { useStakingContract } from 'hooks/useContract'
import { ApprovalState, useApproveCallback } from 'hooks/useApproveCallback'
import useZooParkCallback from 'zooswap-hooks/useZooPark'
import {ZooParkExt} from 'data/ZooPark'
import {ChainId, CurrencyAmount, JSBI, Token, TokenAmount ,StakePool, ZERO} from '@liuxingfeiyu/zoo-sdk'
import { useBlockNumber } from 'state/application/hooks'
import { tokenAmountForshow } from 'utils/ZoosSwap'
import { useSelector } from 'react-redux'
import { AppState } from 'state'
import CurrencyLogo from 'components/CurrencyLogo'
import { useAllTokens } from 'hooks/Tokens'
import { useTranslation } from 'react-i18next'
import fixFloat,{getTimeStr, transToThousandth} from 'utils/fixFloat'
import { Decimal } from "decimal.js"
import { UserRatioOfReward } from '../../constants'
import isZero from 'utils/isZero'
import { TitleShow } from 'components/AuditOrgs'
import { useCurrencyBalance ,useCurrencyBalances } from '../../state/wallet/hooks'



export function BoardItem({pool,key,totalEffect,tvl}:{ pool: StakePool ,key:number ,totalEffect:number,tvl:number}) {
  // const { chainId, account } = useActiveWeb3React()
  // const deadline = useTransactionDeadline()
  // const stakingContract = useStakingContract(pool.lpAddress)
  // const [approval, approveCallback] = useApproveCallback(new TokenAmount(new Token(chainId ?? DefaultChainId, pool.lpAddress, 18), balance), ZOO_PARK_ADDRESS[chainId ?? DefaultChainId])
//  console.log('StakePoolStakePoolStakePool', pool);

  // 个人质押总额
  const myStaked = tokenAmountForshow(pool.myCurrentLp || 0)
  // 个人未领取奖励
  const myReward = tokenAmountForshow(pool.myReward || 0)
  // 个人lp 余额
  const myBalance = tokenAmountForshow(pool.myLpBalance || 0)

  const totalLp = tokenAmountForshow(pool.totalLp || 0)
  
  const totalLpInPark = tokenAmountForshow(pool.totalLpInPark || 0)

  const myRatio =   JSBI.greaterThan(pool.totalLpInPark,ZERO ) ?   (new Decimal(pool.myCurrentLp.toString())).div(new Decimal(pool.totalLpInPark.toString())).toNumber() :0

  const ResponsiveButtonSecondary = styled(ButtonSecondary)`
`

  const BoardRoomDetail = styled.div`
    display : flex;
    justify-content: space-between;
    height : 35px;
  `

  const blockNumber = useBlockNumber() || 0
  const prices:any  =  useSelector<AppState>(state=>state.zoo.tokenPrices)

  const zooPrice:any = useSelector<AppState>(state=>state.zoo.price) || 1

  const prodPerBlock:number = useMemo(()=>  tokenAmountForshow(pool.rewardConfig.getZooRewardBetween(blockNumber, blockNumber+1)) * pool.rewardEffect / totalEffect ,[blockNumber, pool])
  const Apr = useMemo(()=>{
    
    return (prodPerBlock * UserRatioOfReward * zooPrice * 10 * 60 * 24 * 365 * 100) / tvl
  },
  [blockNumber, prices, pool]
  )

  console.log("boardroom-----", pool.rewardConfig.getZooRewardBetween(blockNumber, blockNumber+1).toString(), tokenAmountForshow(pool.rewardConfig.getZooRewardBetween(blockNumber, blockNumber+1)))

  const dayReturn = useMemo(()=>{
    const rewardPrice = prices["ZOO"] 
    const token0Price = prices[pool?.token0?.symbol||""] || 1
    const token1Price = prices[pool?.token1?.symbol||""] || 1

    
    return  rewardPrice? pool.getDayReturn(blockNumber??0,rewardPrice,token0Price*Math.pow(10,18-pool.token0.decimals),token1Price*Math.pow(10,18-pool.token1.decimals)).toNumber() /10000:0
  },[blockNumber])

  const allTokens = useAllTokens()
  const [token0WithLogo,token1WithLogo] =useMemo( ()=>{
    return [ allTokens[pool.token0.address],allTokens[pool.token1.address]]
  },[pool.token0,pool.token1])

  const jumpUrl = `/add/${pool?.token0.address}/${pool?.token1.address}`
  /*const dayProduce = useMemo(()=>{
    //per block every 4s
    return  JSBI.toNumber(pool.rewardConfig.getZooRewardBetween(blockNumber??0,(blockNumber??0)+24*3600/4))*pool.rewardEffect/1e18/10000
  },[blockNumber])*/



  const { t } = useTranslation();
  return (
    <div className="s-boardroom-item">
      <div className="s-boardroom-item-con">
        <div className="s-trading-item-trans">
          <CurrencyLogo currency={token0WithLogo} />
          <Link to={jumpUrl}>
            <img src={ Trans } alt="" className="s-trading-trans" />
            <CurrencyLogo currency={token1WithLogo}  /><br/>
            <h3>{pool.token0.symbol}{'-'}{pool.token1.symbol}</h3>
          </Link>
        </div>

        <div className="s-boardroom-item-details">
          <div className="s-boardroom-detail">
            <BoardRoomDetail>
              <p>{t('productionperblock')}:</p> 
              <p style={{color: '#FFFFFF'}}>{ fixFloat(prodPerBlock * UserRatioOfReward, 2)} YUZU</p>
            </BoardRoomDetail>
            <BoardRoomDetail>
              <p>{t('totalLp')}:</p>
              <p style={{color: '#FFFFFF'}}>{ transToThousandth(fixFloat(tvl, 4))} USDT</p>
            </BoardRoomDetail>
            <BoardRoomDetail>
              <p>{t('myStaked')}:</p> 
              <p style={{color: '#FFFFFF'}}>{ fixFloat(myRatio * 100, 2)}%</p>
            </BoardRoomDetail>
            <BoardRoomDetail>
              <p>{t('myReward')}:</p> 
              <p style={{color: '#FFFFFF'}}>{ fixFloat(myReward, 4)} YUZU</p>
            </BoardRoomDetail> 
            <BoardRoomDetail>
              <p>APR<QuestionHelper text={'This number is estimated given the assumption that each block time is 6s.'}/>：</p>
              <p style={{color: '#FF526C'}}>{fixFloat(Apr, 3)}%</p>
            </BoardRoomDetail>         
          </div>
          <ButtonPrimaryNormal  className="s-boardroom-select" as={Link} padding="6px 18px" to={`/liquiditymining/select/${pool.pid}/extselect/-1`}>
            {t('select')}
          </ButtonPrimaryNormal>
        </div>
      </div>
    </div>
  )
}


export function DoubleGetItem({pool,key,totalEffect,tvl}:{ pool: ZooParkExt ,key:number ,totalEffect:number,tvl:number}) {
  // const { chainId, account } = useActiveWeb3React()
  // const deadline = useTransactionDeadline()
  // const stakingContract = useStakingContract(pool.lpAddress)
  // const [approval, approveCallback] = useApproveCallback(new TokenAmount(new Token(chainId ?? DefaultChainId, pool.lpAddress, 18), balance), ZOO_PARK_ADDRESS[chainId ?? DefaultChainId])
//  console.log('StakePoolStakePoolStakePool', pool);

  // 个人质押总额
  const myStaked = tokenAmountForshow(pool.myCurrentLp || 0)
  // 个人未领取奖励
  const myReward = tokenAmountForshow(pool.myReward || 0)
  // 个人lp 余额
  const myBalance = tokenAmountForshow(pool.myLpBalance || 0)

  const totalLp = tokenAmountForshow(pool.totalLp || 0)
  
  const totalLpInPark = tokenAmountForshow(pool.totalLpInPark || 0)

  const myRatio =   JSBI.greaterThan(pool.totalLpInPark,ZERO ) ?   (new Decimal(pool.myCurrentLp.toString())).div(new Decimal(pool.totalLpInPark.toString())).toNumber() :0



  const ResponsiveButtonSecondary = styled(ButtonSecondary)`
`


  const blockNumber = useBlockNumber() || 0
  const prices:any  =  useSelector<AppState>(state=>state.zoo.tokenPrices)

  const zooPrice:any = useSelector<AppState>(state=>state.zoo.price) || 1

  const prodPerBlock:number = useMemo(()=>  tokenAmountForshow(pool.rewardConfig.getZooRewardBetween(blockNumber, blockNumber+1)) * pool.rewardEffect / totalEffect ,[blockNumber, pool])
  

  const extProdPerBlockInfo: String[] = useMemo(
    ()=>{
      let re: String[] = []
      if(pool.tokenRewards){
        for(let i = 0; i < pool.tokenRewards.length;i++){
          let num = tokenAmountForshow(pool.tokenRewards[i].PerblockReward, pool.tokenRewards[i].token.decimals)
          let str = fixFloat(num , 4)
          str += " "
          str += pool.tokenRewards[i].token.symbol || ""
          re.push(str)
        }
      }
      return re
    },
    [blockNumber, pool]
  )

  const extRewardInfo: String[] = useMemo(
    ()=>{
      let re :String[]= []
      if(pool.tokenRewards){
        for(let i = 0; i < pool.tokenRewards.length;i++){
          let num = tokenAmountForshow(pool.tokenRewards[i].MyPendingAmount, pool.tokenRewards[i].token.decimals)
          let str = fixFloat(num , 4)
          str += " "
          str += pool.tokenRewards[i].token.symbol || ""
          re.push(str)
        }
      }
      return re
    },
    [blockNumber, pool]
  )

  const extSymbolInfo: string = useMemo(
    ()=>{
      let str = ""
      if(pool.tokenRewards){
        for(let i = 0; i < pool.tokenRewards.length;i++){
          str += pool.tokenRewards[i].token.symbol
          str += "+"
        }
      }
      return str.substr(0, str.length-1)
    },
    [blockNumber, pool]
  )


  const xyuzu : boolean = useMemo(()=>{
    return pool.token0.symbol == pool.token1.symbol
  },[pool])

  const [minExtBlock, isIfo] = useMemo(
    ()=>{
      let num: Number = -1;
      let isIfo : boolean = false;
      if(pool.tokenRewards && pool.tokenRewards?.length > 0){
        num = pool.tokenRewards[0].RewardEndAt
        if(pool.tokenRewards[0].ifo){
          isIfo = true
        }
      }
      if(xyuzu) num = xyuzuExtBlock
      return [num.valueOf(), isIfo]
    },
    [blockNumber, pool, xyuzu]
  ) 


  const now = Math.floor((new Date()).valueOf()/1000)
  const [timestamp,setTimeStamp] = useState(now)
  const [lastBlockAt,setLastBlockAt] = useState(now)

  useEffect(()=> {
    setLastBlockAt(Math.floor((new Date()).valueOf()/1000) )
  },[blockNumber])

  const [day,hour,min,second] = useMemo(()=>{
    let nextBlockTime= 0
    let day,hour,min,second
    if (blockNumber&& blockNumber>0) {
      nextBlockTime = (minExtBlock - (blockNumber?? 0))* 6
      nextBlockTime -= (timestamp-lastBlockAt)
      day = Math.floor(nextBlockTime/86400)
      hour = Math.floor((nextBlockTime-day*86400)/ 3600)
      min = Math.floor((nextBlockTime-day*86400-hour*3600)/60)
      second = Math.floor(nextBlockTime%60)
    }
    if(nextBlockTime < 0){
      return [0,0,0,0]
    }
    return [day,hour,min,second]
  },[lastBlockAt,timestamp])

  const TimeCount = (day:number, hour:number, min:number, second:number) =>{
    let notZero : boolean = true
    if(day == 0 && hour == 0 && min == 0 && second == 0){
      notZero = false
      console.log("timecount bool :", notZero)
    }
    let dayStr = getTimeStr(day)
    let hourStr = getTimeStr(hour)
    let minStr = getTimeStr(min)
    let secondStr = getTimeStr(second)
    return (
    <em>
      <TimeBLock notZero={notZero}>{dayStr}</TimeBLock>:
      <TimeBLock notZero={notZero}>{hourStr}</TimeBLock>:
      <TimeBLock notZero={notZero}>{minStr}</TimeBLock>:
      <TimeBLock notZero={notZero}>{secondStr}</TimeBLock>
    </em>
    )
  }

  useEffect(()=>{
    const timer = setTimeout(()=>{
      setTimeStamp(Math.floor((new Date()).valueOf()/1000))
    },1000)
    return () =>{
      clearTimeout(timer)
    }
  },[timestamp])

  //console.log("boardroom-----ext", pool.rewardConfig.getZooRewardBetween(blockNumber, blockNumber+1).toString(), tokenAmountForshow(pool.rewardConfig.getZooRewardBetween(blockNumber, blockNumber+1)))

  const dayReturn = useMemo(()=>{
    const rewardPrice = prices["ZOO"] 
    const token0Price = prices[pool?.token0?.symbol||""] || 1
    const token1Price = prices[pool?.token1?.symbol||""] || 1

    
    return  rewardPrice? pool.getDayReturn(blockNumber??0,rewardPrice,token0Price*Math.pow(10,18-pool.token0.decimals),token1Price*Math.pow(10,18-pool.token1.decimals)).toNumber() /10000:0
  },[blockNumber])

  const allTokens = useAllTokens()
  const { account, chainId } = useActiveWeb3React()
  

  const jumpUrl = `/add/${pool?.token0.address}/${pool?.token1.address}`
  /*const dayProduce = useMemo(()=>{
    //per block every 4s
    return  JSBI.toNumber(pool.rewardConfig.getZooRewardBetween(blockNumber??0,(blockNumber??0)+24*3600/4))*pool.rewardEffect/1e18/10000
  },[blockNumber])*/



  const [token0WithLogo,token1WithLogo] =useMemo( ()=>{
    let str =  xyuzu ? XYUZU_LIST[chainId ?? DefaultChainId] :  allTokens[pool.token0.address]
    return [str ,allTokens[pool.token1.address]]
  },[pool.token0,pool.token1])

  const [yuzuToken, xyuzuToken] : (Token | undefined) [] = useMemo(
    ()=>{
        let re = undefined
        let re1 = XYUZU_LIST[chainId ?? DefaultChainId]
        for(let item of Object.values(allTokens)){
            if(item.symbol == 'YUZU'){
                re = item
            }
        }
        return [re, re1]
    }
    ,
    [allTokens]
  )
  const yuzuBalances = useCurrencyBalances(xyuzuToken?.address ?? undefined, 
    [yuzuToken]
  )

  /*const tvlNum = useMemo(
    ()=>{
      console.log("test xyuzu boardroom----")
      if(xyuzu){
        return parseFloat(yuzuBalances[0]?.toSignificant(6) ?? "0") * zooPrice
      }
      return tvl
    },[xyuzu, blockNumber, pool, tvl]
  )*/

  const Apr = useMemo(()=>{
    let extprice = 0
    if(pool.tokenRewards){
      for(let i = 0; i < pool.tokenRewards.length;i++){
        let num = tokenAmountForshow(pool.tokenRewards[i].PerblockReward, pool.tokenRewards[i].token.decimals)
        let tokenExtPrice = prices[pool.tokenRewards[i].token.symbol || ""] || 1
        extprice += num * tokenExtPrice
      }
    }
    
    return ((prodPerBlock * UserRatioOfReward * zooPrice + extprice )* 10 * 60 * 24 * 365 * 100) / tvl
  },
  [blockNumber, prices, pool]
  )


  const RewardShow = styled.div`
    color: #FFF;
    text-align: center;
    display: inline-block;
    vertical-align: middle;
    line-height: 34px;
    background: #2C3035;
    border-radius: 8px;
  `

  const TimeBLock = styled.div<{notZero : boolean}>`
    text-align: center;
    display: inline-block;
    background: #333333;
    border-radius: 4px;
    border: 1px solid #F57C78;
    line-height: 18px;
    color: ${({notZero})=>(notZero ? '#FFFFFF' :  '#D0D0D0')};
    min-width: 20px;
  `

  const { t } = useTranslation();
  return (
    <div className="s-doubleget-item">
      <div className="s-doubleget-item-con">
        <div className="s-doubleget-item-trans">
        <Link to={jumpUrl}>
        <CurrencyLogo style={{display: 'inline-block', verticalAlign: 'middle'}} currency={token0WithLogo} />
        <span>&nbsp;&nbsp;</span>
        {!xyuzu && <CurrencyLogo style={{display: 'inline-block', verticalAlign: 'middle'}} currency={token1WithLogo}  />}
        <span>&nbsp;&nbsp;</span>
        { <h3 style={{display: 'inline-block', margin: '0px auto', verticalAlign: 'middle', lineHeight: '34px', color: '#FFFFFF'}}>{pool.token0.symbol}{!xyuzu && '-' + pool.token1.symbol}</h3> }
        </Link>
        <div className="s-xyuzu-tab-wrapper">
          <RewardShow >
            <img className="s-doubleget-icon" src={DoublegetIcon}/>
            YUZU&nbsp;{extSymbolInfo?'+':''}&nbsp;{extSymbolInfo}&nbsp;
          </RewardShow>
        </div>
        </div>

        <div className="s-doubleget-item-details">
        <div className="s-doubleget-item-detail">
              {
                pool.pid == 5 ?
                <label>Stablecoin Pair</label> 
                :
                pool.tokenRewards && pool.tokenRewards.length == 0?
                <label> </label> 
                :
                // xyuzu?
                // <label>Single Token Staking :</label> 
                // :
                isIfo ? 
                <label>Initial Farm Offering :</label> 
                :
                minExtBlock != 0 ?
                <label>Dual Yield Countdown <QuestionHelper text={'This number is estimated given the assumption that each block time is 6s.'}/>:</label> 
                :
                <label>Dual Yield 
                  {pool.tokenRewards && pool.tokenRewards[0].ifo?.desc ?
                    <QuestionHelper text={pool.tokenRewards[0].ifo?.desc as string}/>
                    :
                    null
                  }
                </label> 
              }
              
              {
                pool.tokenRewards && pool.tokenRewards.length == 0?
                <label></label> 
                // :
                // xyuzu?
                // <strong style={{color: "rgb(255, 255, 255, 0.6)"}}>xYUZU
                // <img 
                //   src={WebLinkJump} 
                //   height={'15px'} 
                //   style={{display:'inline-block', marginBottom:'-3px' ,cursor:'pointer'}}
                //   onClick={()=>{
                //     window.location.href= "#"
                //     window.location.href= "#/xyuzu"
                //   }}
                // />
                // </strong>
                :
                minExtBlock != 0 ?
                TimeCount(day ?? 0, hour ?? 0, min ?? 0, second ?? 0)
                :
                isIfo?
                <strong style={{color: "rgb(255, 255, 255, 0.6)"}}>{(pool.tokenRewards && pool.tokenRewards[0].ifo?.title)+ " " ?? ''} 
                <img 
                  src={WebLinkJump} 
                  height={'15px'} 
                  style={{display:'inline-block', marginBottom:'-3px' ,cursor:'pointer'}}
                  onClick={()=>{window.open(((pool.tokenRewards && pool.tokenRewards[0].ifo?.link) ?? "")as string)}}
                />
                </strong>
                :
                <strong style={{color: "rgb(255, 255, 255, 0.6)"}}>Permanent</strong>
              }
          </div>
          <div className="s-doubleget-item-detail" style={{height: '80px'}}>
              <label>{t('productionperblock')}:</label> 
              <em>{ fixFloat(prodPerBlock * UserRatioOfReward, 2)} YUZU 
              {
                extProdPerBlockInfo.map((value : String)=>{
                  return (<>
                    <br/>
                    {value}
                  </>)
                })
              }
              </em>
          </div>
          <div className="s-doubleget-item-detail">
              <label>{t('totalLp')}:</label>
              <em>{ transToThousandth(fixFloat(tvl, 4))} USDT</em>
          </div>
          <div className="s-doubleget-item-detail">
              <label>{t('myStaked')}:</label> 
              <em>{ fixFloat(myRatio * 100, 2)}%</em>
          </div>
          <div className="s-doubleget-item-detail" style={{height: '80px'}}>
              <label>{t('myReward')} <QuestionHelper text={t('doublegetRewardHint')}/>:</label> 
              <em>{ fixFloat(myReward, 4)} YUZU
              {
                extRewardInfo.map((value : String)=>{
                  return (<>
                    <br/>
                    {value}
                  </>)
                })
              }
              </em>      
          </div>
          <div className="s-doubleget-item-detail">
            <label>APR<QuestionHelper text={'This number is estimated given the assumption that each block time is 6s.'}/>：</label>
            <em style={{color:'#FF526C'}}>{fixFloat(Apr, 3)}%</em>
          </div>
        </div>
        <div className="s-doubleget-item-detail" style={{}}>
          <ButtonPrimaryNormal  className="s-boardroom-select" as={Link} padding="6px 18px" to={`/liquiditymining/select/-1/extselect/${pool.pid}`}>
          {t('select')}
          </ButtonPrimaryNormal>
        </div>
      </div>
    </div>
  )
}


export default function Boardroom({rooms,statics, extrooms, extstatics}:{rooms: StakePool[],statics:any, extrooms: ZooParkExt[], extstatics: any}) {

  const { chainId, account } = useActiveWeb3React()
  
  let totalEffect = 0
  for(let i = 0; i < rooms.length; i++){
    totalEffect += rooms[i].rewardEffect
  }

  for(let i = 0; i < extrooms.length; i++){
    totalEffect += extrooms[i].rewardEffect
  }
  const [ ableList, expireList, ableIndexList, expireIndexList ] = useMemo(
    ()=>{
      let ableList : ZooParkExt[] = []
      let expireList : ZooParkExt[] = []
      let ableIndexList : number[] = []
      let expireIndexList : number[] = [] 
      for(let i = 0; i< extrooms.length; i++){
        if(extrooms[i].rewardEffect == 0){
          expireList.push(extrooms[i])
          expireIndexList.push(i)
        }
        else{
          ableList.push(extrooms[i])
          ableIndexList.push(i)
        }
      }
      return [ableList, expireList, ableIndexList, expireIndexList]
    },
    [extrooms]
  )
  const Titleb = styled.h1`
  text-align : center;
  font-weight: 500;
  color: #333333;
  `
  const Titlew = styled.h1`
  text-align : center;
  font-weight: 500;
  color: #FFFFFF;
  margin-top: 40px;
  `

  const [showDetail , SetShowDetail] = useState<boolean>(false)
  const buttonText = useMemo(
    ()=>{
      if(showDetail){
        return 'hide'
      }
      else{
        return 'show detail'
      }
    },
    [showDetail]
  )
  return (
    <div>
      <TitleShow str={'FEATURED POOL'}/>
      <div className="s-trading-list">
        {ableList.map((pool: ZooParkExt, i: number) => {
          return <DoubleGetItem key={i} pool={pool} totalEffect={totalEffect} tvl={ (extstatics && extstatics.tvls&&extstatics.tvls[ableIndexList[i]])||0}/>
        })}
      </div>
      <TitleShow str={'ALL FARMS'}/>
      <div className="s-trading-list">
        {rooms.map((pool: StakePool, i: number) => {
          return <BoardItem key={i} pool={pool} totalEffect={totalEffect} tvl={ (statics && statics.tvls&&statics.tvls[i])||0}/>
        })}
      </div>
      <div style={{ position: 'relative', width:'100%' }}>
        <TitleShow str={'EXPIRED POOL'}/>
        <span className='s-pool-detail'>
          <ButtonShowDetail onClick={()=>SetShowDetail(!showDetail)}> {buttonText}</ButtonShowDetail>
        </span>
      </div>
      {
        showDetail?
        <div className="s-trading-list">
          {expireList.map((pool, i) => {
            return <DoubleGetItem key={i} pool={pool} totalEffect={totalEffect} tvl={ (extstatics && extstatics.tvls&&extstatics.tvls[expireIndexList[i]])||0}/>
          })}
        </div>
        :
        null
      }
    </div>
  )
}

