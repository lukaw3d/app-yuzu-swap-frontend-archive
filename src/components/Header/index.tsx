import { ChainId, TokenAmount, Currency } from '@liuxingfeiyu/zoo-sdk'
import React, { useState, useRef, useMemo } from 'react'
import { useOnClickOutside } from '../../hooks/useOnClickOutside'
import { Text } from 'rebass'
import { NavLink } from 'react-router-dom'
import { darken } from 'polished'
import { useTranslation } from 'react-i18next'

import styled from 'styled-components'

// import Logo from '../../assets/svg/logo.svg'
// import LogoDark from '../../assets/svg/logo_white.svg'
import Settings from '../Settings'
import Logo from '../../assets/newUI/logo.png'
import Arrow from '../../assets/newUI/layoutArrow.png'
import reatBanner from '../../assets/newUI/reatBanner.png'
import LogoHover from '../../assets/newUI/logo_hover.png'

import { useActiveWeb3React } from '../../hooks'
import { useDarkModeManager } from '../../state/user/hooks'
import { useETHBalances, useAggregateUniBalance } from '../../state/wallet/hooks'
import { CardNoise } from '../earn/styled'
import { CountUp } from 'use-count-up'
import { TYPE, ExternalLink } from '../../theme'

import { YellowCard } from '../Card'
import { Moon, Sun } from 'react-feather'
import Menu from '../Menu'
import Language from '../Language'

import Row, { RowFixed } from '../Row'
import Web3Status from '../Web3Status'
import ClaimModal from '../claim/ClaimModal'
import { useToggleSelfClaimModal, useShowClaimPopup } from '../../state/application/hooks'
import { useUserHasSubmittedClaim } from '../../state/transactions/hooks'
import { Dots } from '../swap/styleds'
import Modal from '../Modal'
import UniBalanceContent from './UniBalanceContent'
import usePrevious from '../../hooks/usePrevious'
import { RPC } from 'connectors'
import { SUSHI } from '../../constants'
import { chain } from 'lodash'
import { ReactComponent as DropDown } from '../../assets/images/dropdown.svg'
import { relative } from 'path'

const HeaderFrame = styled.div`
  display: grid;
  grid-template-columns: 1fr 120px;
  align-items: center;
  justify-content: space-between;
  align-items: center;
  flex-direction: row;
  width: 100%;
  height: 85px;
  top: 0;
  position: relative;
  padding: 1rem;
  z-index: 2;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  ${({ theme }) => theme.mediaWidth.upToMedium`
    grid-template-columns: 1fr;
    padding: 0 1rem;
    width: calc(100%);
    position: relative;
    border-bottom: none;
  `};

  ${({ theme }) => theme.mediaWidth.upToExtraSmall`
        padding: 0.5rem 1rem;
  `}
`

const HeaderControls = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-self: flex-end;
  width: fit-content;
  min-width: 33vw;
  margin-top: -15px;

  ${({ theme }) => theme.mediaWidth.upToMedium`
    flex-direction: row;
    justify-content: space-between;
    justify-self: center;
    width: 100%;
    max-width: 960px;
    padding: 1rem;
    position: fixed;
    bottom: 0px;
    left: 0px;
    width: 100%;
    z-index: 99;
    height: 72px;
    border-radius: 12px 12px 0 0;
    background-color: ${({ theme }) => theme.bg6};
  `};

  ${({ theme }) => theme.mediaWidth.upToExtraSmall`
    padding: 5px;
  `}
`

const HeaderElement = styled.div`
  display: flex;
  align-items: center;

  /* addresses safari's lack of support for "gap" */
  & > *:not(:first-child) {
    margin-left: 8px;
  }

  ${({ theme }) => theme.mediaWidth.upToMedium`
    flex-direction: row-reverse;
    align-items: center;

    & > *:not(:first-child) {
      margin-left: 4px;
    }
  `};
`

const HeaderElementWrap = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-around;
  width: 50%;
`

const HeaderRow = styled(RowFixed)`
  ${({ theme }) => theme.mediaWidth.upToMedium`
   width: 100%;
  `};
`

const HeaderGap = styled.div`
  margin-top: -1rem;
  border-right: 1px solid rgba(255, 255, 255, 0.2);
  height: 85px;
  width: 0px;
  ${({ theme }) => theme.mediaWidth.upToMedium`
    border-right: none;
  `};
`

const HeaderLinks = styled(Row)`
  justify-content: center;
  ${({ theme }) => theme.mediaWidth.upToMedium`
    padding: 1rem 0 1rem 1rem;
    justify-content: flex-end;
`};
`

const AccountElement = styled.div<{ active: boolean }>`
  display: flex;
  flex-direction: row;
  align-items: center;
  background-color: ${({ theme, active }) => (!active ? theme.bg1 : theme.bg3)};
  border-radius: ${({ theme }) => theme.borderRadius};
  white-space: nowrap;
  width: 100%;
  cursor: pointer;

  :focus {
    border: 1px solid blue;
  }
`

const UNIAmount = styled(AccountElement)`
  width: 80px;
  height: 36px;
  border-radius: 4px;
  border: 1px solid #FFFFFF;
  font-size: 16px;
  color: #FFFFFF;
  background: rgba(255, 255, 255, 0.3);
  display: inline-block;
  text-align: center;
  line-height: 36px;
  font-weight: 500;
`

const UNIWrapper = styled.span`
  width: fit-content;
  position: relative;
  cursor: pointer;

  :hover {
    opacity: 0.8;
  }

  :active {
    opacity: 0.9;
  }
`

const HideSmall = styled.span`
  ${({ theme }) => theme.mediaWidth.upToSmall`
    display: none;
  `};
`

const NetworkCard = styled(YellowCard)`
  border-radius: ${({ theme }) => theme.borderRadius};
  padding: 8px 12px;
  white-space: nowrap;
  color: #FFFFFF;
  cursor: pointer;
  :hover {
    opacity: 0.8;
  }
  opacity: 0.59;
  border: 1px solid #FFFFFF;
  ${({ theme }) => theme.mediaWidth.upToSmall`
    margin: 0;
    margin-right: 0.5rem;
    width: initial;
    overflow: hidden;
    text-overflow: ellipsis;
    flex-shrink: 1;
  `};
`

const BalanceText = styled(Text)`
  ${({ theme }) => theme.mediaWidth.upToExtraSmall`
    display: none;
  `};
`

const Title = styled.a`
  display: flex;
  align-items: center;
  pointer-events: auto;
  justify-self: flex-start;
  margin-right: 12px;
  ${({ theme }) => theme.mediaWidth.upToSmall`
    justify-self: center;
  `};
  :hover {
    cursor: pointer;
  }
`

const StaticIcon = styled.div`
  padding-left: 4px;
  position: absolute;
  display: flex;
  align-items: center;
  :hover {
    opacity: 0;
  }
`
const HoverIcon = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  margin-top: -27px;
`

const activeClassName = 'ACTIVE'

const StyledNavLink = styled(NavLink).attrs({
  activeClassName
})`
  ${({ theme }) => theme.flexRowNoWrap}
  align-items: left;
  outline: none;
  cursor: pointer;
  text-decoration: none;
  color: ${({ theme }) => theme.bg2};
  font-size: 18px;
  width: fit-content;
  margin: 0 12px;
  font-weight: 400;
  height: 36px;

  &.${activeClassName} {
    font-weight: bold;
    font-size: 18px;
    color: ${({ theme }) => theme.bg2};
  }
`

const StyledNOutLink = styled.div<{ isActive?: boolean }>`
  ${({ theme }) => theme.flexRowNoWrap}
  align-items: left;
  outline: none;
  cursor: pointer;
  text-decoration: none;
  color: ${({ theme }) => theme.bg2};
  font-size: 18px;
  width: fit-content;
  margin: 0 12px;
  font-weight: 400;
  height: 36px;
  ${({isActive}) =>
    isActive? `font-weight: bold;` : ``
  }
`

/*
  :hover,
  :focus {
    color: ${({ theme }) => darken(0.1, theme.text2)};
  }
  */

const StyledExternalLink = styled(ExternalLink).attrs({
  activeClassName
})<{ isActive?: boolean }>`
  ${({ theme }) => theme.flexRowNoWrap}
  align-items: left;
  border-radius: 3rem;
  outline: none;
  cursor: pointer;
  text-decoration: none;
  color: ${({ theme }) => theme.text2};
  font-size: 1rem;
  width: fit-content;
  margin: 0 12px;
  font-weight: 500;

  &.${activeClassName} {
    border-radius: ${({ theme }) => theme.borderRadius};
    font-weight: 600;
    color: ${({ theme }) => theme.text2};
  }

  :hover,
  :focus {
    color: ${({ theme }) => darken(0.1, theme.text2)};
    text-decoration:none;
  }

  ${({ theme }) => theme.mediaWidth.upToExtraSmall`
      display: none;
`}
`

export const StyledMenuButton = styled.button`
  position: relative;
  width: 100%;
  height: 100%;
  border: none;
  background-color: transparent;
  margin: 0;
  padding: 0;
  height: 35px;
  background-color: ${({ theme }) => theme.bg3};
  margin-left: 8px;
  padding: 0.15rem 0.5rem;
  border-radius: 20px;

  :hover,
  :focus {
    cursor: pointer;
    outline: none;
    background-color: ${({ theme }) => theme.bg4};
  }

  svg {
    margin-top: 2px;
  }
  > * {
    stroke: ${({ theme }) => theme.text1};
  }

  ${({ theme }) => theme.mediaWidth.upToMedium`
    margin-left: 4px;
  `};
`
const StyledMenu = styled.div`
  margin-left: 0.5rem;
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
  border: none;
  text-align: left;

  ${({ theme }) => theme.mediaWidth.upToExtra2Small`
    margin-left: 0.2rem;
  `};
`

const MenuFlyout = styled.span`
  border-radius: ${({ theme }) => theme.borderRadius};
  ${({ theme }) => theme.mediaWidth.upToMedium`
    :after{
      border-color: #fff transparent transparent transparent !important;
      top: 70px !important;
    }
  `};
`
const StyledDropDown = styled(DropDown)`
  margin: 0 0.25rem 0.1rem 0.5rem;
  height: 35%;

  path {
    stroke: ${({ theme }) => (theme.white)};
    stroke-width: 1.5px;
  }
`

const NETWORK_LABELS: { [chainId in ChainId]?: string } = {
  [ChainId.MAINNET]: 'Ethereum',
  [ChainId.RINKEBY]: 'Rinkeby',
  [ChainId.ROPSTEN]: 'Ropsten',
  [ChainId.GÖRLI]: 'Görli',
  [ChainId.KOVAN]: 'Kovan',
  [ChainId.FANTOM]: 'Fantom',
  [ChainId.FANTOM_TESTNET]: 'Fantom Testnet',
  [ChainId.MATIC]: 'Matic',
  [ChainId.MATIC_TESTNET]: 'Matic Testnet',
  [ChainId.XDAI]: 'xDai',
  [ChainId.BSC]: 'BSC',
  [ChainId.BSC_TESTNET]: 'BSC Testnet',
  [ChainId.OKCHAIN_TEST]: 'OKExChain Testnet',
  [ChainId.OKCHAIN]: 'OKChain',
  [ChainId.MOONBASE]: 'Moonbase',
  [ChainId.AVALANCHE]: 'Avalanche',
  [ChainId.FUJI]: 'Fuji',
  [ChainId.HECO]: 'HECO',
  [ChainId.HECO_TESTNET]: 'HECO Testnet',
  [ChainId.OASISETH_TEST]: 'Emerald Testnet',
  [ChainId.OASISETH_MAIN]: 'Emerald mainnet'
}

export const CHAIN_CONFIG = {
  [ChainId.OASISETH_TEST]: {
    chainId: '0xa515',
    rpcUrl: RPC[ChainId.OASISETH_TEST],
    chainName: NETWORK_LABELS[ChainId.OASISETH_TEST]||'',
    blockExplorerUrl: 'https://explorer.testnet.oasis.updev.si/',
  },
  [ChainId.OASISETH_MAIN]: {
    chainId: '0xa516',
    rpcUrl: RPC[ChainId.OASISETH_MAIN],
    chainName: NETWORK_LABELS[ChainId.OASISETH_MAIN]||'',
    blockExplorerUrl: 'https://explorer.emerald.oasis.dev/',
  }
}

export default function Header() {
  const { account, chainId } = useActiveWeb3React()
  const { t } = useTranslation()

  const { ethereum } = window

  async function addChain(chainId : string, rpcUrl: string, chainName: string, blockExplorerUrl: string) {
    try {
      const eRequest = ethereum?.request
      if(eRequest){
        await eRequest({
          method: 'wallet_addEthereumChain',
          params: [{ chainId: chainId, rpcUrls: [rpcUrl] , chainName: chainName, blockExplorerUrls: [blockExplorerUrl] }],
        });
      }
      
    } catch (addError) {
      console.log(addError)
    }
  }

  async function switchChain(chainId: string, rpcUrl: string, chainName: string, blockExplorerUrl: string) {
    try {
      const eRequest = ethereum?.request
      if(eRequest){
        await eRequest({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: chainId }],
        });
      }
      
    } catch (switchError) {
      // This error code indicates that the chain has not been added to MetaMask.
      if (switchError.code === 4902) {
        addChain(chainId, rpcUrl, chainName, blockExplorerUrl)
      }
      // handle other "switch" errors
    }
    
  }

  async function addCurrency(address: string, sybmol: string, decimals: number) {
    const eRequest = ethereum?.request
    if(eRequest){
      await eRequest({
      method: 'wallet_watchAsset',
      params: {
        type: 'ERC20',
        options: {
          address: address,
          symbol: sybmol,
          decimals: decimals,
        },
      },
      })
      .then((success: any) => {
        if (success) {
          console.log('successfully added to wallet!')
        } else {
          throw new Error('Something went wrong.')
        }
      })
      .catch(console.error)

    }
  }

  const userEthBalance = useETHBalances(account ? [account] : [])?.[account ?? '']
  // const [isDark] = useDarkModeManager()
  const [darkMode, toggleDarkMode] = useDarkModeManager()

  const toggleClaimModal = useToggleSelfClaimModal()

  const node = useRef<HTMLDivElement>()
  const [open, setOpen] = useState<boolean>(false)
  useOnClickOutside(node, ()=>setOpen(false))

  const bnode = useRef<HTMLDivElement>()
  const [bopen, setBOpen] = useState<boolean>(false)
  useOnClickOutside(bnode, ()=>setBOpen(false))

  const enode = useRef<HTMLDivElement>()
  const [eopen, setEOpen] = useState<boolean>(false)
  useOnClickOutside(enode, ()=>setEOpen(false))

  const aggregateBalance: TokenAmount | undefined = useAggregateUniBalance()

  const [showUniBalanceModal, setShowUniBalanceModal] = useState(false)
  const showClaimPopup = useShowClaimPopup()

  const countUpValue = aggregateBalance?.toFixed(0) ?? '0'
  const countUpValuePrevious = usePrevious(countUpValue) ?? '0'

  const isMainNet:boolean = useMemo(
    ()=>{
      return chainId && chainId == ChainId.OASISETH_MAIN ? true : false
    }
    ,
    [chainId]
  )

  return (
    <HeaderFrame className="s-header-frame">
      <ClaimModal />
      <Modal isOpen={showUniBalanceModal} onDismiss={() => setShowUniBalanceModal(false)}>
        <UniBalanceContent setShowUniBalanceModal={setShowUniBalanceModal} />
      </Modal>
      <HeaderRow className="s-header-row">
        <Title href="https://yuzu-swap.com">
          <HoverIcon>
            <img width={'145px'} height={'42px'} src={Logo} alt="logo" className="s-header-logo" />
          </HoverIcon>
          {/* <StaticIcon>
            <img width={'40px'} src={Logo} alt="logo" className="s-header-logo" />
          </StaticIcon> */}
        </Title>
        <HeaderGap/>
        <HeaderLinks className="s-header-links">
          <StyledNavLink id={`swap-nav-link`} to={'/homepage'}>
            {t('homepage')}
          </StyledNavLink>
          <StyledNavLink id={`swap-nav-link`} to={'/swap'}>
            {t('swap')}
          </StyledNavLink>
          <StyledNavLink
            id={`pool-nav-link`}
            to={'/pool'}
            isActive={(match, { pathname }) =>
              Boolean(match) ||
              pathname.startsWith('/add') ||
              pathname.startsWith('/remove') ||
              pathname.startsWith('/create') ||
              pathname.startsWith('/find')
            }
          >
            {t('pool')}
          </StyledNavLink>
          <div ref={enode as any} style={{position:"relative"}}>
            <StyledNOutLink id={`earn-nav-link`} onClick={()=>setEOpen(!eopen)}
            isActive={
              window.location.href.includes('tradingmining') ||
              window.location.href.includes('liquiditymining') 
          }
            >
              {t('earn')}
              <img src={Arrow} height={"16px"} style={{margin:"5px 0 0 0"}}/>
            </StyledNOutLink>
            {eopen && (
                <MenuFlyout className="s-top-links s-header-flyout">
                  <a className="s-top-link-button"  href='#/tradingmining'>
                    {t('tradingmining')}
                  </a>
                  <a className="s-top-link-button" href='#/liquiditymining'>
                    {t('boardroom')}
                  </a>
                </MenuFlyout>
              )}
          </div>
          <StyledNavLink id={`zap-nav-link`} to={'/xyuzu'}>
            {t('xyuzu')}
          </StyledNavLink>
          <StyledNavLink id={`zap-nav-link`} to={'/zap'}>
            {t('zap')}
          </StyledNavLink>
          <div ref={bnode as any} style={{position:"relative"}}>
            <StyledNOutLink id={`bridge-nav-link`} onClick={()=>setBOpen(!bopen)}>
              {t('bridge')}
              <img src={Arrow} height={"16px"} style={{margin:"5px 0 0 0"}}/>
            </StyledNOutLink>
            {bopen && (
                <MenuFlyout className="s-top-links s-header-flyout" style={{minWidth: '6rem'}}>
                  <a className="s-top-link-button" onClick={()=>
                    window.open("https://wormholebridge.com/#/transfer")}>
                    Wormhole
                  </a>
                  <a className="s-top-link-button" onClick={()=>
                    window.open("https://cbridge.celer.network/#/transfer")}>
                    CBridge
                  </a>
                  <a className="s-top-link-button" onClick={()=>
                    window.open("https://multichain.xyz/")}>
                    MultiChain
                  </a>
                </MenuFlyout>
              )}
          </div>
          {/* <StyledNavLink id={`boardroom-nav-link`} to={'/singlecurrency'}>
            {t('singleCurrencyPledge')}
          </StyledNavLink> */}
          {/* <StyledNavLink id={`stake-nav-link`} to={'/sushi'}>
            SUSHI
          </StyledNavLink> */}
          {/* <StyledNavLink id={`stake-nav-link`} to={'/vote'}>
            Vote
          </StyledNavLink> */}
          {/* {chainId === ChainId.MAINNET && (
            <StyledNavLink id={`stake-nav-link`} to={'/stake'}>
              Stake
            </StyledNavLink>
          )} */}
          {/* {chainId && (
            <StyledExternalLink id={`analytics-nav-link`} href={'https://analytics.sushi.com'}>
              Analytics <span style={{ fontSize: '11px' }}>↗</span>
            </StyledExternalLink>
          )} */}
        </HeaderLinks>
      </HeaderRow>
      <HeaderControls className="s-header-controls">
        <HeaderElement className="s-header-element">
          <HideSmall>
            <StyledMenu ref={node as any}>
              {chainId && NETWORK_LABELS[chainId] ?
                <NetworkCard  onClick={()=>setOpen(true)} title={NETWORK_LABELS[chainId]}>{NETWORK_LABELS[chainId]}
                  {!isMainNet && <StyledDropDown/>}
                </NetworkCard>
                :
                <NetworkCard  onClick={()=>setOpen(true)} title={'Switch Chain'}>{'Switch Chain'}
                  {!isMainNet && <StyledDropDown/>}
                </NetworkCard>
              }
              {open && !isMainNet && (
                <MenuFlyout className="s-top-links">
                  {/*<button className="s-top-link-button" onClick={()=>switchChain(CHAIN_CONFIG[ChainId.OASISETH_TEST].chainId, CHAIN_CONFIG[ChainId.OASISETH_TEST].rpcUrl, CHAIN_CONFIG[ChainId.OASISETH_TEST].chainName, CHAIN_CONFIG[ChainId.OASISETH_TEST].blockExplorerUrl)}>
                    <span>Emerald Testnet</span>
              </button>*/}
                  <button className="s-top-link-button" onClick={()=>switchChain(CHAIN_CONFIG[ChainId.OASISETH_MAIN].chainId, CHAIN_CONFIG[ChainId.OASISETH_MAIN].rpcUrl, CHAIN_CONFIG[ChainId.OASISETH_MAIN].chainName, CHAIN_CONFIG[ChainId.OASISETH_MAIN].blockExplorerUrl)}>
                    <span>Emerald Mainnet</span>
                  </button>
                </MenuFlyout>
              )}
            </StyledMenu>
            
          </HideSmall>
          <AccountElement active={!!account} style={{ pointerEvents: 'auto' }}>
            {account && chainId && userEthBalance ? (
              <BalanceText style={{ flexShrink: 0 }} pl="0.75rem" pr="0.5rem" fontWeight={500} >
                {userEthBalance?.toSignificant(4)} {Currency.getNativeCurrencySymbol(chainId)}
              </BalanceText>
            ) : null}
            <Web3Status />
          </AccountElement>
        </HeaderElement>
        <HeaderElementWrap className="s-header-elment-wrapper">
          <StyledMenuButton onClick={() => toggleDarkMode()} className="s-darkmodes">
            {darkMode ? <Moon size={20} /> : <Sun size={20} />}
          </StyledMenuButton>
          <Settings />
          <Menu />
          {/*<Language/>*/}
        </HeaderElementWrap>
      </HeaderControls>
    </HeaderFrame>
  )
}
