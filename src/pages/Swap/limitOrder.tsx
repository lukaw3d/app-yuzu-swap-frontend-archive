import { CurrencyAmount, JSBI, Token, Trade, Fraction, Currency, TokenAmount } from '@liuxingfeiyu/zoo-sdk'
import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { ArrowDown } from 'react-feather'
import ReactGA from 'react-ga'
import { Text } from 'rebass'
import { ThemeContext } from 'styled-components'
import AddressInputPanel from '../../components/AddressInputPanel'
import { ButtonError, ButtonLight, ButtonPrimary, ButtonConfirmed, ButtonLRTab } from '../../components/Button'
import Card, { GreyCard } from '../../components/Card'
import Column, { AutoColumn } from '../../components/Column'
import ConfirmSwapModal from '../../components/swap/ConfirmSwapModal'
import CurrencyInputPanel, {CurrencyInputPanelWithPrice} from '../../components/CurrencyInputPanel'
import { SwapPoolTabs } from '../../components/NavigationTabs'
import { AutoRow, RowBetween, RowFixed, SplitRow} from '../../components/Row'
import AdvancedSwapDetailsSection from '../../components/swap/AdvancedSwapDetailsSection'
import BetterTradeLink, { DefaultVersionLink } from '../../components/swap/BetterTradeLink'
import confirmPriceImpactWithoutFee from '../../components/swap/confirmPriceImpactWithoutFee'
import { ArrowWrapper, BottomGrouping, SwapCallbackError, Wrapper } from '../../components/swap/styleds'
import TradePrice from '../../components/swap/TradePrice'
import TokenWarningModal from '../../components/TokenWarningModal'
import ProgressSteps from '../../components/ProgressSteps'
import SwapHeader from '../../components/swap/SwapHeader'

import { ETHFakeAddress, INITIAL_ALLOWED_SLIPPAGE } from '../../constants'
import { getTradeVersion } from '../../data/V1'
import { useActiveWeb3React } from '../../hooks'
import { useCurrency, useAllTokens } from '../../hooks/Tokens'
import { ApprovalState, useApproveCallbackFromTrade, useApproveCallbackFromTradeLO } from '../../hooks/useApproveCallback'
import useENSAddress from '../../hooks/useENSAddress'
import { useSwapCallback } from '../../hooks/useSwapCallback'
import useToggledVersion, { DEFAULT_VERSION, Version } from '../../hooks/useToggledVersion'
import useWrapCallback, { WrapType } from '../../hooks/useWrapCallback'
import { useToggleSettingsMenu, useWalletModalToggle } from '../../state/application/hooks'
import { Field } from '../../state/swap/actions'
import {
  useDefaultsFromURLSearch,
  useDerivedSwapInfo,
  useSwapActionHandlers,
  useSwapState,
  tryParseAmount
} from '../../state/swap/hooks'
import { useExpertModeManager, useUserSlippageTolerance, useUserSingleHopOnly } from '../../state/user/hooks'
import { LinkStyledButton, TYPE } from '../../theme'
import { maxAmountSpend } from '../../utils/maxAmountSpend'
import { computeTradePriceBreakdown, warningSeverity } from '../../utils/prices'
import AppBody from '../AppBody'
import { ClickableText } from '../Pool/styleds'
import Loader from '../../components/Loader'
import { useIsTransactionUnsupported } from 'hooks/Trades'
import UnsupportedCurrencyFooter from 'components/swap/UnsupportedCurrencyFooter'
import { isTradeBetter } from 'utils/trades'
import Sloganer from '../../components/Sloganer'
import { useTranslation } from 'react-i18next'
import LOArrowPng from '../../assets/newUI/limitOrderArrow.png'
import { ShowLimitOrders } from 'components/LimitOrder'
import QuestionHelper from 'components/QuestionHelper'
import { useLimitOrderCreateTaskCallback } from 'zooswap-hooks/useLimitOrderCalback'

type Props = {
  show : boolean;
};

const SwitchWrapper : React.FC<Props> = ({show , children})=>(
  
  show?
  <div className="s-xyuzu-tab-wrapper" style={{width:"100%"}}>
      {children}
  </div>
  :
  <div style={{width:"100%"}}>
      {children}
  </div>
  
)

export default function LimitOrder() {
  const { t } = useTranslation();
  const loadedUrlParams = useDefaultsFromURLSearch()

  // token warning stuff
  const [loadedInputCurrency, loadedOutputCurrency] = [
    useCurrency(loadedUrlParams?.inputCurrencyId),
    useCurrency(loadedUrlParams?.outputCurrencyId)
  ]
  const [dismissTokenWarning, setDismissTokenWarning] = useState<boolean>(false)
  const urlLoadedTokens: Token[] = useMemo(
    () => [loadedInputCurrency, loadedOutputCurrency]?.filter((c): c is Token => c instanceof Token) ?? [],
    [loadedInputCurrency, loadedOutputCurrency]
  )
  const handleConfirmTokenWarning = useCallback(() => {
    setDismissTokenWarning(true)
  }, [])

  // dismiss warning if all imported tokens are in active lists
  const defaultTokens = useAllTokens()
  const importTokensNotInDefault =
    urlLoadedTokens &&
    urlLoadedTokens.filter((token: Token) => {
      return !Boolean(token.address in defaultTokens)
    })

  const { account, chainId } = useActiveWeb3React()
  const theme = useContext(ThemeContext)

  // toggle wallet when disconnected
  const toggleWalletModal = useWalletModalToggle()

  // for expert mode
  const toggleSettings = useToggleSettingsMenu()
  const [isExpertMode] = useExpertModeManager()

  // get custom setting values for user
  const [allowedSlippage] = useUserSlippageTolerance()

  // swap state
  const { independentField, typedValue, recipient } = useSwapState()
  const {
    v1Trade,
    v2Trade,
    currencyBalances,
    parsedAmount,
    currencies,
    inputError: swapInputError
  } = useDerivedSwapInfo()
  const { wrapType, execute: onWrap, inputError: wrapInputError } = useWrapCallback(
    currencies[Field.INPUT],
    currencies[Field.OUTPUT],
    typedValue
  )
  const showWrap: boolean = wrapType !== WrapType.NOT_APPLICABLE
  const { address: recipientAddress } = useENSAddress(recipient)
  const toggledVersion = useToggledVersion()
  const tradesByVersion = {
    [Version.v1]: v1Trade,
    [Version.v2]: v2Trade
  }
  const trade = showWrap ? undefined : tradesByVersion[toggledVersion]
  const defaultTrade = showWrap ? undefined : tradesByVersion[DEFAULT_VERSION]

  const betterTradeLinkV2: Version | undefined =
    toggledVersion === Version.v1 && isTradeBetter(v1Trade, v2Trade) ? Version.v2 : undefined

  const parsedAmounts = showWrap
    ? {
        [Field.INPUT]: parsedAmount,
        [Field.OUTPUT]: parsedAmount
      }
    : {
        [Field.INPUT]: independentField === Field.INPUT ? parsedAmount : trade?.inputAmount,
        [Field.OUTPUT]: independentField === Field.OUTPUT ? parsedAmount : trade?.outputAmount
      }

  const { onSwitchTokens, onCurrencySelection, onUserInput, onChangeRecipient } = useSwapActionHandlers()
  const isValid = !swapInputError
  const dependentField: Field = independentField === Field.INPUT ? Field.OUTPUT : Field.INPUT

  const handleTypeInput = useCallback(
    (value: string) => {
      onUserInput(Field.INPUT, value)
    },
    [onUserInput]
  )
  const handleTypeOutput = useCallback(
    (value: string) => {
      onUserInput(Field.OUTPUT, value)
    },
    [onUserInput]
  )

  // modal and loading
  const [{ showConfirm, tradeToConfirm, swapErrorMessage, attemptingTxn, txHash }, setSwapState] = useState<{
    showConfirm: boolean
    tradeToConfirm: Trade | undefined
    attemptingTxn: boolean
    swapErrorMessage: string | undefined
    txHash: string | undefined
  }>({
    showConfirm: false,
    tradeToConfirm: undefined,
    attemptingTxn: false,
    swapErrorMessage: undefined,
    txHash: undefined
  })

  const formattedAmounts = {
    [independentField]: typedValue,
    [dependentField]: showWrap
      ? parsedAmounts[independentField]?.toExact() ?? ''
      : parsedAmounts[dependentField]?.toSignificant(6) ?? ''
  }

  const route = trade?.route
  const userHasSpecifiedInputOutput = Boolean(
    currencies[Field.INPUT] && currencies[Field.OUTPUT] && parsedAmounts[independentField]?.greaterThan(JSBI.BigInt(0))
  )
  const noRoute = !route

  // check whether the user has approved the router on the input token
  const [approval, approveCallback] = useApproveCallbackFromTradeLO(trade, allowedSlippage)

  // check if user has gone through approval process, used to show two step buttons, reset on token change
  const [approvalSubmitted, setApprovalSubmitted] = useState<boolean>(false)

  // mark when a user has submitted an approval, reset onTokenSelection for input field
  useEffect(() => {
    if (approval === ApprovalState.PENDING) {
      setApprovalSubmitted(true)
    }
  }, [approval, approvalSubmitted])

  const maxAmountInput: CurrencyAmount | undefined = maxAmountSpend(currencyBalances[Field.INPUT])
  const atMaxAmountInput = Boolean(maxAmountInput && parsedAmounts[Field.INPUT]?.equalTo(maxAmountInput))

  // the callback to execute the swap
  const { callback: swapCallback, error: swapCallbackError } = useSwapCallback(trade, allowedSlippage, recipient)

  const { priceImpactWithoutFee } = computeTradePriceBreakdown(trade)

  const [singleHopOnly] = useUserSingleHopOnly()

  const handleSwap = useCallback(() => {
    if (priceImpactWithoutFee && !confirmPriceImpactWithoutFee(priceImpactWithoutFee)) {
      return
    }
    if (!swapCallback) {
      return
    }
    setSwapState({ attemptingTxn: true, tradeToConfirm, showConfirm, swapErrorMessage: undefined, txHash: undefined })
    swapCallback()
      .then(hash => {
        setSwapState({ attemptingTxn: false, tradeToConfirm, showConfirm, swapErrorMessage: undefined, txHash: hash })

        ReactGA.event({
          category: 'Swap',
          action:
            recipient === null
              ? 'Swap w/o Send'
              : (recipientAddress ?? recipient) === account
              ? 'Swap w/o Send + recipient'
              : 'Swap w/ Send',
          label: [
            trade?.inputAmount?.currency?.symbol,
            trade?.outputAmount?.currency?.symbol,
            getTradeVersion(trade)
          ].join('/')
        })

        ReactGA.event({
          category: 'Routing',
          action: singleHopOnly ? 'Swap with multihop disabled' : 'Swap with multihop enabled'
        })
      })
      .catch(error => {
        setSwapState({
          attemptingTxn: false,
          tradeToConfirm,
          showConfirm,
          swapErrorMessage: error.message,
          txHash: undefined
        })
      })
  }, [
    priceImpactWithoutFee,
    swapCallback,
    tradeToConfirm,
    showConfirm,
    recipient,
    recipientAddress,
    account,
    trade,
    singleHopOnly
  ])

  // errors
  const [showInverted, setShowInverted] = useState<boolean>(false)

  // warnings on slippage
  const priceImpactSeverity = warningSeverity(priceImpactWithoutFee)

  // show approve flow when: no error on inputs, not approved or pending, or approved in current session
  // never show if price impact is above threshold in non expert mode
  const showApproveFlow =
    !swapInputError &&
    (approval === ApprovalState.NOT_APPROVED ||
      approval === ApprovalState.PENDING ||
      (approvalSubmitted && approval === ApprovalState.APPROVED)) &&
    !(priceImpactSeverity > 3 && !isExpertMode)

  const handleAcceptChanges = useCallback(() => {
    setSwapState({ tradeToConfirm: trade, swapErrorMessage, txHash, attemptingTxn, showConfirm })
  }, [attemptingTxn, showConfirm, swapErrorMessage, trade, txHash])

  const handleInputSelect = useCallback(
    inputCurrency => {
      setApprovalSubmitted(false) // reset 2 step UI for approvals
      onCurrencySelection(Field.INPUT, inputCurrency)
    },
    [onCurrencySelection]
  )

  const handleMaxInput = useCallback(() => {
    maxAmountInput && onUserInput(Field.INPUT, maxAmountInput.toExact())
  }, [maxAmountInput, onUserInput])

  const handleOutputSelect = useCallback(outputCurrency => onCurrencySelection(Field.OUTPUT, outputCurrency), [
    onCurrencySelection
  ])

  const swapIsUnsupported = useIsTransactionUnsupported(currencies?.INPUT, currencies?.OUTPUT)

  const [ifBuy, setIfBuf] = useState<boolean>(false)

  const [price, setPrice] = useState<string>('')
  const [LOraw , limitOutput]:[ Fraction | undefined, string ] = useMemo(
    ()=>{
      if(trade){
        const priceAmount = tryParseAmount(price , ifBuy? trade.inputAmount.currency : trade.outputAmount.currency )
        if(!priceAmount){
          return [undefined ,'']
        }
        if(ifBuy){
          return  [trade.inputAmount.divide(priceAmount) ,trade.inputAmount.divide(priceAmount).toSignificant(6)]
        }
        else{
          return [trade.inputAmount.multiply(priceAmount), trade.inputAmount.multiply(priceAmount).toSignificant(6)]
        }
      }
      return  [undefined ,'']
    },
    [trade, ifBuy, price]
  )

  const limitOrderAble : boolean = useMemo(
    ()=>{
      if(trade){
        const priceAmount = tryParseAmount(price , ifBuy? trade.inputAmount.currency : trade.outputAmount.currency )
        if(!priceAmount){
          return false
        }
        let realPrice: Fraction  = priceAmount as Fraction
        const divValue = tryParseAmount('1', trade.inputAmount.currency)?.divide(priceAmount)
        if(ifBuy){
          if(divValue){
            realPrice = divValue
            if(realPrice.greaterThan(trade.executionPrice)){
              return true
            }
          }
        }else{
          if(realPrice.greaterThan(trade.executionPrice)){
            return true
          }
        }
        
      }
      return false
    },
    [trade, ifBuy, price]
  )

  const [limitOrderFee, SwapFee]: [string,  string] = useMemo(
    ()=>{
      if(limitOutput && trade){
        return [trade.inputAmount.multiply(new Fraction( '2' , '1000')).toSignificant(6), 
                trade.inputAmount.multiply(new Fraction( '3' , '1000')).toSignificant(6)
                ]
      }
      return ['','']
    }
    ,[trade]
  )

  const [inTokenAddress, outTokenAddress, inAmount, outAmount ] :[string, string, JSBI, JSBI ] =  useMemo(
    ()=>{
      let inTokenAddress : string = ''
      let outTokenAddress : string = ''
      let inAmount : JSBI = JSBI.BigInt(0)
      let outAmount : JSBI = JSBI.BigInt(0)

      if(trade && LOraw){
        if( trade.inputAmount instanceof TokenAmount){
          inTokenAddress = (trade.inputAmount as any as TokenAmount).token.address;
        }else{
          inTokenAddress = ETHFakeAddress
        }
        if(trade.outputAmount instanceof TokenAmount){
          outTokenAddress = (trade.outputAmount as any as TokenAmount).token.address
        }else{
          outTokenAddress = ETHFakeAddress
        }
        inAmount = trade.inputAmount.raw;
        const outAmountCur =  tryParseAmount(limitOutput, trade.outputAmount.currency)
        outAmount = outAmountCur ? outAmountCur.raw : JSBI.BigInt(0)
      }
      return [inTokenAddress, outTokenAddress, inAmount, outAmount]
    },[trade, price, ifBuy, limitOutput]
  )
  
  const createTask = useLimitOrderCreateTaskCallback(inTokenAddress, outTokenAddress, inAmount, outAmount)
  
  const [{isPendingLO, txhashLO, showConfirmLO }, setLOState] = useState<{
    isPendingLO : boolean,
    txhashLO: string | undefined,
    showConfirmLO: boolean
  }>(
    {
      isPendingLO: false,
      txhashLO: undefined,
      showConfirmLO: false
    }
  )

  const handleCreateTask = useCallback(
    ()=>{
      setLOState({isPendingLO: true, txhashLO: undefined, showConfirmLO})
      createTask().then(
        (txhash)=>{
          setLOState(
            {
              isPendingLO: false,
              txhashLO: txhash,
              showConfirmLO
            }
          )
        }
      ).catch(
        (error)=>{
          setLOState(
            {
              isPendingLO: false,
              txhashLO: undefined,
              showConfirmLO
            }
          )
        }
      )
    },
    [createTask, trade, price, ifBuy, limitOutput]
  )

  const handleConfirmDismiss = useCallback(() => {
    setLOState(
      {
        isPendingLO: false,
        txhashLO: undefined,
        showConfirmLO: false
      }
    )

  }, [createTask, trade, price, ifBuy, limitOutput, isPendingLO, txhashLO])




  return (
    <>
      <TokenWarningModal
        isOpen={importTokensNotInDefault.length > 0 && !dismissTokenWarning}
        tokens={importTokensNotInDefault}
        onConfirm={handleConfirmTokenWarning}
      />
      <SwapPoolTabs active={'swap'} />
      <div id="page-homepage">
        <Sloganer/>
      </div>
      <AppBody>
        <div style={{display : 'flex', padding : "20px 0 20px " , height: "90px"}}>
          <div className="s-xyuzu-tab" >
              <SwitchWrapper show={false} >
                  <ButtonLRTab  disabled={false} onClick={()=>{window.location.href= "#/swap"}}>SWAP</ButtonLRTab>
              </SwitchWrapper>
              <SwitchWrapper show={true}>
                  <ButtonLRTab  disabled={true} onClick={()=>{window.location.href= "#/limitorder"}}>LIMIT</ButtonLRTab>
              </SwitchWrapper>
          </div>
          <div className='s-limitorder-tab'>
              <SwitchWrapper show={ ifBuy} >
                  <ButtonLRTab  disabled={ifBuy} onClick={()=>{setIfBuf(true)}}>BUY</ButtonLRTab>
              </SwitchWrapper>
              <SwitchWrapper show={!ifBuy}>
                  <ButtonLRTab  disabled={!ifBuy} onClick={()=>{setIfBuf(false)}}>SELL</ButtonLRTab>
              </SwitchWrapper>
          </div>
        </div>
        <Wrapper id="swap-page" style={{background: '#2C3035', borderRadius: '8px 8px 0 0', border:'1px solid rgba(255, 255, 255, 0.2)'}}>

          <ConfirmSwapModal
            isOpen={showConfirmLO}
            trade={trade}
            originalTrade={tradeToConfirm}
            onAcceptChanges={handleAcceptChanges}
            attemptingTxn={isPendingLO}
            txHash={txhashLO}
            recipient={recipient}
            allowedSlippage={allowedSlippage}
            onConfirm={handleCreateTask}
            swapErrorMessage={swapErrorMessage}
            onDismiss={handleConfirmDismiss}
            isLimitOrder={true}
            limitOutput={LOraw}
          />
          {/* <AutoColumn gap={isExpertMode ? 'md' : 'none'} style={{ paddingBottom: '1rem' }}> */}
          <AutoColumn gap={isExpertMode ? 'md' : '15px'}>
            <div className='s-limitorder-dark'>
              <CurrencyInputPanelWithPrice
                label={'You Pay'}
                value={formattedAmounts[Field.INPUT]}
                showMaxButton={!atMaxAmountInput}
                currency={currencies[Field.INPUT]}
                priceCurrency={currencies[Field.OUTPUT]}
                onUserInput={handleTypeInput}
                onPriceInput={val=>setPrice(val)}
                onMax={handleMaxInput}
                ifBuy={ifBuy}
                isInput={true}
                trade={trade}
                onCurrencySelect={handleInputSelect}
                otherCurrency={currencies[Field.OUTPUT]}
                id="swap-currency-input"
                containerBackground={'#23272B'}
              />
            </div>
            <div style={{ position: 'relative', zIndex: 2, height: '50px' }}>
                <img src={LOArrowPng}  className="s-absolute-mid" style={{ height:'30px', transform: ifBuy?'rotate(180deg)':'' }} />
            </div>
            <div className='s-limitorder-dark'>
              <CurrencyInputPanelWithPrice
                value={limitOutput}
                onUserInput={()=>{}}
                label={'You Receive'}
                showMaxButton={false}
                currency={currencies[Field.OUTPUT]}
                onCurrencySelect={handleOutputSelect}
                otherCurrency={currencies[Field.INPUT]}
                id="swap-currency-output"
                containerBackground={'#23272B'}
                isInput={false}
                trade={trade}
              />
            </div>

            {recipient !== null && !showWrap ? (
              <>
                <AutoRow justify="space-between" style={{ padding: '0 1rem' }}>
                  <ArrowWrapper clickable={false}>
                    <ArrowDown size="16" color={theme.text2} />
                  </ArrowWrapper>
                  <LinkStyledButton id="remove-recipient-button" onClick={() => onChangeRecipient(null)}>
                    - Remove send
                  </LinkStyledButton>
                </AutoRow>
                <AddressInputPanel id="recipient" value={recipient} onChange={onChangeRecipient} />
              </>
            ) : null}
          </AutoColumn>
          <AutoColumn style={{ marginTop:"0.8rem" }}>
            <Text fontSize={14} color={theme.text3}>{t('limitRiskNotice')}</Text>
          </AutoColumn>
          <BottomGrouping style={{marginTop: "0.8rem" }} >
            {swapIsUnsupported ? (
              <ButtonPrimary disabled={true}>
                <TYPE.main mb="4px">{t('invalidassets')}</TYPE.main>
              </ButtonPrimary>
            ) : !account ? (
              <ButtonLight onClick={toggleWalletModal}>{t('connectwallet')}</ButtonLight>
            ) : showWrap ? (
              <ButtonError disabled={true} onClick={()=>{}}>
                Invalid Pair
              </ButtonError>
            ) : showApproveFlow ? (
              <RowBetween>
                <ButtonConfirmed
                  onClick={approveCallback}
                  disabled={approval !== ApprovalState.NOT_APPROVED || approvalSubmitted}
                  width="48%"
                  altDisabledStyle={approval === ApprovalState.PENDING} // show solid button while waiting
                  confirmed={approval === ApprovalState.APPROVED}
                >
                  {approval === ApprovalState.PENDING ? (
                    <AutoRow gap="6px" justify="center">
                      Approving <Loader stroke="white" />
                    </AutoRow>
                  ) : approvalSubmitted && approval === ApprovalState.APPROVED ? (
                    'Approved'
                  ) : (
                    'Approve ' + currencies[Field.INPUT]?.getSymbol(chainId)
                  )}
                </ButtonConfirmed>
                <ButtonError
                  onClick={() => {
                    setSwapState({
                      tradeToConfirm: trade,
                      attemptingTxn: false,
                      swapErrorMessage: undefined,
                      showConfirm: true,
                      txHash: undefined
                    })
                    setLOState(
                      {
                        isPendingLO: false,
                        txhashLO: undefined,
                        showConfirmLO: true
                      }
                    )
                  }}
                  width="48%"
                  id="swap-button"
                  disabled={
                    !isValid || approval !== ApprovalState.APPROVED 
                  }
                >
                  <Text fontSize={16} fontWeight={500}>
                    Create Order
                  </Text>
                </ButtonError>
              </RowBetween>
            ) : !limitOrderAble ? (
              <ButtonError disabled={true} onClick={()=>{}}>
                Price Is Too Low
              </ButtonError>
            ):(
              <ButtonError
                onClick={() => {
                    setSwapState({
                      tradeToConfirm: trade,
                      attemptingTxn: false,
                      swapErrorMessage: undefined,
                      showConfirm: true,
                      txHash: undefined
                    })
                    setLOState(
                      {
                        isPendingLO: false,
                        txhashLO: undefined,
                        showConfirmLO: true
                      }
                    )
                }}
                id="swap-button"
                disabled={!isValid || !!swapCallbackError}
              >
                <Text fontSize={20} fontWeight={500}>
                  Create Order
                </Text>
              </ButtonError>
            )}
            {showApproveFlow && (
              <Column style={{ marginTop: '1rem' }}>
                <ProgressSteps steps={[approval === ApprovalState.APPROVED]} />
              </Column>
            )}
            {isExpertMode && swapErrorMessage ? <SwapCallbackError error={swapErrorMessage} /> : null}
            {betterTradeLinkV2 && !swapIsUnsupported && toggledVersion === Version.v1 ? (
              <BetterTradeLink version={betterTradeLinkV2} />
            ) : toggledVersion !== DEFAULT_VERSION && defaultTrade ? (
              <DefaultVersionLink />
            ) : null}
          </BottomGrouping>
        </Wrapper>
        <Wrapper  style={{background: '#2C3035', borderRadius: '0 0 8px 8px ', borderLeft:'1px solid rgba(255, 255, 255, 0.2)',  borderRight:'1px solid rgba(255, 255, 255, 0.2)', borderBottom:'1px solid rgba(255, 255, 255, 0.2)'}}>
          <AutoColumn>
            {showWrap ? null : (
              <Card padding={showWrap ? '.25rem 1rem 0 1rem' : '0px'} borderRadius={'20px'}>
                {/* <AutoColumn gap="8px" style={{ padding: '0 16px' }}>
                  {Boolean(trade) && (
                    <RowBetween align="center">
                      <Text fontWeight={500} fontSize={14} color={theme.text3}>
                        Price
                      </Text>
                      <TradePrice
                        price={trade?.executionPrice}
                        showInverted={showInverted}
                        setShowInverted={setShowInverted}
                      />
                    </RowBetween>
                  )}
                </AutoColumn> */}
                <AutoColumn gap="8px" style={{ padding: '0 16px' }}>
                  <RowBetween align="center">
                    <Text fontWeight={500} fontSize={14} color={theme.text3}>
                      LimitOrder Fee
                      <QuestionHelper text={t('limitTip')} />
                    </Text>
                    
                    <Text fontSize={14} color={theme.text3}>
                      {limitOrderFee + ' ' +  (trade ? trade.inputAmount.currency.getSymbol(chainId) : '-')}
                    </Text>

                  </RowBetween>
                  <RowBetween align="center">
                    <Text fontWeight={500} fontSize={14} color={theme.text3}>
                      Swap Fee
                      <QuestionHelper text={t('handingTip')} />
                    </Text>
                    
                    <Text fontSize={14} color={theme.text3}>
                      {SwapFee + ' ' +  (trade ? trade.inputAmount.currency.getSymbol(chainId) : '-')}
                    </Text>

                  </RowBetween>
                </AutoColumn>
              </Card>
            )}
            {/* <AdvancedSwapDetailsSection trade={trade} /> */}
          </AutoColumn>
        </Wrapper>
      </AppBody>
      <ShowLimitOrders/>
      {!swapIsUnsupported ? null : (
        <UnsupportedCurrencyFooter show={swapIsUnsupported} currencies={[currencies.INPUT, currencies.OUTPUT]} />
      )}
    </>
  )
}
