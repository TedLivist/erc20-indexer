import {
  Box,
  Button,
  Center,
  Flex,
  Heading,
  Image,
  Input,
  SimpleGrid,
  Text,
} from '@chakra-ui/react';
import { Alchemy, Network, Utils } from 'alchemy-sdk';
import { useState, useEffect } from 'react';
import { ethers } from 'ethers';

const provider = new ethers.providers.Web3Provider(window.ethereum);

function App() {
  const [userAddress, setUserAddress] = useState('');
  const [results, setResults] = useState([]);
  const [hasQueried, setHasQueried] = useState(false);
  const [tokenDataObjects, setTokenDataObjects] = useState([]);

  const [loader, setLoader] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    async function getAccounts() {
      const accounts = await provider.send('eth_requestAccounts', []);

      setUserAddress(accounts[0]);
      
      // check if current chain is mainnet ETH, if not set it to mainnet ETH
      const chainId = await window.ethereum.request({ method: 'eth_chainId' })
      if (chainId !== '0x1') { // Ethereum's chainId
        await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0x1' }]
        })
      }
    }

    getAccounts();
  }, []);

  function errorCheck(string) {
    let errorMsg = 'Invalid address';
    const lastFourChars = string.substr(-4)

    if(lastFourChars == ".eth") {
      setError('')
    } else if(string.length < 42 || string.length > 42) {
      setError(errorMsg)
    } else if(!string.startsWith('0x')) {
      setError(errorMsg)
    } else {
      setError('')
    }
  }

  async function getTokenBalance() {
    setLoader("Loading...")
    errorCheck(userAddress)

    const config = {
      apiKey: import.meta.env.VITE_API_KEY,
      network: Network.ETH_MAINNET,
    };

    const alchemy = new Alchemy(config);
    const data = await alchemy.core.getTokenBalances(userAddress);

    const tokenDataPromises = [];

    for (let i = 0; i < data.tokenBalances.length; i++) {
      const tokenData = alchemy.core.getTokenMetadata(
        data.tokenBalances[i].contractAddress
      );
      tokenDataPromises.push(tokenData);
    }

    let tokensData = await Promise.all(tokenDataPromises);

    const realTokens = [];
    const validIndices = [];

    let tokenBal = {}

    for(let i = 0; i < tokensData.length; i++) {
      if(tokensData[i].name != "" && tokensData[i].symbol != "") {
        realTokens.push(tokensData[i]);
        validIndices.push(i);
      }
    }

    tokenBal = {
      address: data.address,
      tokenBalances: data.tokenBalances.filter((_, index) => 
        validIndices.includes(index)
      )
    }

    setResults(tokenBal);
    setTokenDataObjects(realTokens);

    setHasQueried(true);
    setLoader('');
  }

  return (
    <Box w="100vw">
      <Center>
        <Flex
          alignItems={'center'}
          justifyContent="center"
          flexDirection={'column'}
        >
          <Heading mb={0} fontSize={36}>
            ERC-20 Token Indexer
          </Heading>
          <Text>
            Plug in an address and this website will return all of its ERC-20
            token balances!
          </Text>
        </Flex>
      </Center>
      <Flex
        w="100%"
        flexDirection="column"
        alignItems="center"
        justifyContent={'center'}
      >
        <Heading mt={42}>
          Get all the ERC-20 token balances of this address:
        </Heading>
        <Input
          onChange={(e) => setUserAddress(e.target.value)}
          color="black"
          w="600px"
          textAlign="center"
          p={4}
          bgColor="white"
          fontSize={24}
          value={userAddress}
        />

        {error && (
          <div className='loader'>{error}</div>
        )}

        <Button fontSize={20} onClick={getTokenBalance} mt={36} bgColor="blue">
          Check ERC-20 Token Balances
        </Button>

        {(loader && (error.length == 0)) && (
          <div className='loader'>{loader}</div>
        )}

        <Heading my={36}>ERC-20 token balances:</Heading>

        <Text>
          This app displays only ERC20 tokens that have valid names and symbols
        </Text>

        {hasQueried ? (
          <SimpleGrid w={'90vw'} columns={4} spacing={24}>
            {results.tokenBalances.map((e, i) => {
              return (
                <Flex
                  flexDir={'column'}
                  color="white"
                  bg="blue"
                  w={'21vw'}
                  key={i}
                >
                  <Box>
                    <b>Symbol:</b> ${tokenDataObjects[i].symbol}&nbsp;
                  </Box>
                  <Box>
                    <b>Balance:</b>&nbsp;
                    {Utils.formatUnits(
                      e.tokenBalance,
                      tokenDataObjects[i].decimals
                    )}
                  </Box>
                  <Image src={tokenDataObjects[i].logo} />
                </Flex>
              );
            })}
          </SimpleGrid>
        ) : (
          'Please make a query! This may take a few seconds...'
        )}
      </Flex>
    </Box>
  );
}

export default App;
