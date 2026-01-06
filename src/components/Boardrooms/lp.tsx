import React,{ useContext, useMemo, useRef, useReducer } from 'react'
import styled from 'styled-components'
import { CardProps, Text } from 'rebass'
import QuestionHelper from '../QuestionHelper'
import { Box } from 'rebass/styled-components'
import { Link } from 'react-router-dom'

import { ButtonPrimaryNormal, ButtonSecondary } from '../../components/Button'

import { XYUZU_LIST, blockNumPerS, DefaultChainId }  from '../../constants'
import { useActiveWeb3React } from 'hooks'
import { STAKING_REWARDS_INTERFACE } from 'constants/abis/staking-rewards'
import { useMultipleContractSingleData } from 'state/multicall/hooks'
//import { ZERO } from '@liuxingfeiyu/zoo-sdk//constants'
import useTransactionDeadline from 'hooks/useTransactionDeadline'
import { useStakingContract } from 'hooks/useContract'
import { ApprovalState, useApproveCallback } from 'hooks/useApproveCallback'
import useZooParkCallback from 'zooswap-hooks/useZooPark'
import {ChainId, CurrencyAmount, JSBI, Token, TokenAmount ,StakePool, ZERO} from '@liuxingfeiyu/zoo-sdk'
import { useBlockNumber } from 'state/application/hooks'
import { tokenAmountForshow,numberToString } from 'utils/ZoosSwap'
import { useTranslation } from 'react-i18next'
import { Decimal } from "decimal.js"
import { fixFloatFloor } from 'utils/fixFloat'
import { useCurrencyBalance ,useCurrencyBalances } from '../../state/wallet/hooks'




export default function BoardroomLP({zoopark}:{zoopark :StakePool}  ) {
  const { t } = useTranslation();
  const onAdd = async () => {
    // await deposit(index, "0")
  }
  const Line = styled.div`
  display: flex;
  justify-content: space-between;
`

  const poolShareRatio =  JSBI.greaterThan(zoopark.totalLp,ZERO)?   (new Decimal(zoopark.myLpBalance.toString() ).div( new Decimal(zoopark.totalLp.toString())).toNumber()):0
 
  console.log("zoopark.myLpBalance ", zoopark.myLpBalance.toString(10)," poolRatio is ",poolShareRatio)

  const ResponsiveButtonSecondary = styled(ButtonSecondary)`
`
  const xyuzu : boolean = useMemo(()=>{
    return zoopark && zoopark.token0.symbol == zoopark.token1.symbol
  },[zoopark])

  const { account, chainId } = useActiveWeb3React()
  const xyuzuToken = XYUZU_LIST[chainId ?? DefaultChainId]
  const xyuzuBalances = useCurrencyBalances(account ?? undefined, 
    [xyuzuToken]
)

  const jumpUrl = `/add/${zoopark.token0.address}/${zoopark.token1.address}`
  const isSpecial = zoopark.token0.decimals == 6 && zoopark.token1.decimals == 6 ? 12 : 8

  return (
    <div className="s-boardroom-lp">
      <div className="s-trading-item-details">
        {
          xyuzu?
          <Line style={{marginBottom:"0.5rem"}}>
            <h2>xYUZU</h2>
            <h2 style={{cursor:"pointer"}} onClick={()=>{window.location.href= "#/xyuzu"}}>Get xYUZU</h2>
          </Line>
          :
          <h2  style={{marginBottom:"0.5rem"}}>{zoopark.token0.symbol}/{zoopark.token1.symbol}</h2>
        }
        {
          xyuzu?
          <div className="s-trading-item-detail">
              <label>Your xYUZU Balance：</label>
              <em>{xyuzuBalances[0]?.toSignificant(6)}</em>
            </div>
          :
          <>
            <div className="s-trading-item-detail">
              <label>{t('myLpBalance')}: </label>
              <em>{fixFloatFloor(JSBI.toNumber(zoopark.myLpBalance)/1e18, isSpecial)}</em>
            </div>
            <div className="s-trading-item-detail">
              <label>{zoopark.token0.symbol} ：</label>
              <em>{fixFloatFloor(tokenAmountForshow(zoopark.token0Balance,zoopark.token0.decimals)*poolShareRatio, 8) }</em>
            </div>
            <div className="s-trading-item-detail">
              <label>{zoopark.token1.symbol}：</label>
              <em>{fixFloatFloor(tokenAmountForshow(zoopark.token1Balance,zoopark.token1.decimals)*poolShareRatio, 8) } </em>
            </div>
          </>
        }
        
        <div className="s-trading-item-detail">
          <label>{t('poolTokenPercentage')}:</label>
          <em>{(poolShareRatio*100) .toFixed(2)} % </em>
        </div>
      </div>   
      {!xyuzu && 
      <ResponsiveButtonSecondary style={{margin: '1rem auto'}} className="s-boardroom-select" as={Link} padding="6px 18px" to={jumpUrl}>
      {t('add')}
      </ResponsiveButtonSecondary>}
    </div>
  )
}
