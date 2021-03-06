import { getSymbols, getSymbol, getKlines, getLastKline, checkInterval, intervals } from './rest'


const _symbols = getSymbols() // Out from searchSymbols func, for economy month limit request

const configurationData = {
	supports_marks: false,
	supports_timescale_marks: false,
	supports_time: true,
	supported_resolutions: Object.keys(intervals)
}

// onReady => resolveSymbol => getBars => subscribeBars
export default {
	// get a configuration of your datafeed (e.g. supported resolutions, exchanges and so on)
	onReady: (callback) => {
		console.log('[onReady]: Method call')
		setTimeout(() => callback(configurationData)) // callback must be called asynchronously
	},
	// no need if not using search
	searchSymbols: async (userInput, exchange, symbolType, onResultReadyCallback) => {
		console.log('[searchSymbols]: Method call')

		const symbols = await _symbols // get sync data
		const data = symbols.data.response

		if (data.length > 0) {
			const filteredSymbols = data.filter(i => i.symbol.includes(userInput) || i.name.includes(userInput))  // filter symbols

			const updSymbols = filteredSymbols.map(i => {
				return {
					symbol: i.symbol,
					ticker: i.symbol,
					full_name: i.name,
					description: i.name,
					exchange: 'Forex',
					//	type: i.market,
					//	locale: i.locale,
				}
			})

			return onResultReadyCallback(updSymbols)
		}

		console.log('[searchSymbols] Not found')
		onResultReadyCallback([])

	},
	// retrieve information about a specific symbol (exchange, price scale, full symbol etc.)
	resolveSymbol: async (symbolName, onSymbolResolvedCallback, onResolveErrorCallback) => {
		console.log('[resolveSymbol]: Method call', symbolName)

		const comps = symbolName.split(':')
		symbolName = (comps.length > 1 ? comps[1] : symbolName).toUpperCase()

		const symbolInfo = ({ symbol, name, pricescale, quoteAsset }) => ({
			name: symbol,
			description: name,
			ticker: symbol,
			//exchange: 'Forex',
			//listed_exchange: 'Binance',
			//type: 'crypto',
			session: '24x7',
			minmov: 1,
			pricescale: pricescale || 10000, // https://github.com/tradingview/charting_library/wiki/Symbology#common-prices
			has_intraday: true,
			has_daily: true,
			has_weekly_and_monthly: true,
			has_no_volume: false, // if no volume in response kline data, disable indicator
			currency_code: quoteAsset,
			timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
		})

		const symbol = await getSymbol(symbolName)

		if (symbol) {
			// console.log(symbol)
			return onSymbolResolvedCallback(symbolInfo(symbol))
		}

		onResolveErrorCallback('[resolveSymbol]: symbol not found')

	},
	// get historical data for the symbol
	getBars: async (symbolInfo, interval, from, to, onHistoryCallback, onErrorCallback, firstDataRequest) => {
		console.log('[getBars] Method call', symbolInfo, interval)
		console.log('[getBars] First request', firstDataRequest)

		if (!checkInterval(interval)) {
			return onErrorCallback('[getBars] Invalid interval')
		}

		const klines = await getKlines({symbol: symbolInfo.ticker, interval, from, to, firstDataRequest});
		(klines.length > 0) ? onHistoryCallback(klines) : onErrorCallback('Klines data error')

	},

	// subscription to real-time updates
	subscribeBars: (symbolInfo, resolution, onRealtimeCallback, subscribeUID, onResetCacheNeededCallback) => {
		console.log('[subscribeBars]: Method call with subscribeUID:', subscribeUID)

		// Global variable
		window.interval = setInterval(function () {
			getLastKline(symbolInfo.ticker, resolution).then(kline => {
				console.log(kline)
				onRealtimeCallback(kline)
			})
		}, 1000 * 60) // 60s update interval

	},
	unsubscribeBars: (subscriberUID) => {
		console.log('[unsubscribeBars]: Method call with subscriberUID:', subscriberUID)

		clearInterval(window.interval)
		console.log('[unsubscribeBars]: cleared')
	},
};