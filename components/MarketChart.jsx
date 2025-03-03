"use client";

import React, { useEffect, useRef, useState } from 'react';
import { createChart, ColorType } from 'lightweight-charts';
import { supabase } from '@/lib/supabaseClient';

const MarketChart = ({ 
  tokenAddress, 
  marketId,
  marketStartTime, 
  marketEndTime, 
  startingPrice, 
  initialPriceHistory = [],
  marketName,
  onPriceUpdate
}) => {
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const seriesRef = useRef(null);
  const legendRef = useRef(null);
  const [priceData, setPriceData] = useState(initialPriceHistory);
  const [currentPrice, setCurrentPrice] = useState(startingPrice || 0);

  // Initialize the chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Create chart with dark theme
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: 'solid', color: '#1F2937' }, // Dark background
        textColor: '#D1D5DB', // Light text
      },
      rightPriceScale: {
        scaleMargins: {
          top: 0.1,
          bottom: 0.2,
        },
        borderColor: '#374151',
        visible: true, // Ensure price scale is visible
        borderVisible: true,
        ticksVisible: true,
        // Format price labels for small decimal values
        formatPrice: (price) => price.toFixed(8),
      },
      timeScale: {
        borderColor: '#374151',
        timeVisible: true,
        secondsVisible: true,
        tickMarkFormatter: (time) => {
          const date = new Date(time * 1000);
          return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        },
      },
      crosshair: {
        horzLine: {
          visible: true,
          labelVisible: true,
        },
        vertLine: {
          visible: true,
          labelVisible: true,
        },
      },
      grid: {
        vertLines: {
          color: '#293548',
          visible: false,
        },
        horzLines: {
          color: '#293548',
          visible: false,
        },
      },
      width: chartContainerRef.current.clientWidth,
      height: 240, // Set a fixed height
    });

    chartRef.current = chart;

    // Add area series - using v4 API style
    const areaSeries = chart.addAreaSeries({
      topColor: 'rgba(16, 185, 129, 0.56)', // Green with transparency
      bottomColor: 'rgba(16, 185, 129, 0.04)',
      lineColor: 'rgba(16, 185, 129, 1)',
      lineWidth: 2,
      crosshairMarkerVisible: true,
      crosshairMarkerRadius: 4,
      priceFormat: {
        type: 'price',
        precision: 8,
        minMove: 0.00000001,
      },
      // Base the chart on absolute values, not relative changes
      baseLineVisible: false,
      lastValueVisible: true,
    });

    seriesRef.current = areaSeries;

    // Create legend
    const legendElement = document.createElement('div');
    legendElement.style.position = 'absolute';
    legendElement.style.left = '12px';
    legendElement.style.top = '12px';
    legendElement.style.zIndex = '1';
    legendElement.style.fontSize = '14px';
    legendElement.style.fontFamily = 'sans-serif';
    legendElement.style.lineHeight = '18px';
    legendElement.style.fontWeight = '300';
    legendElement.style.color = '#D1D5DB';
    chartContainerRef.current.appendChild(legendElement);

    // Add market name to legend
    if (marketName) {
      const marketNameRow = document.createElement('div');
      marketNameRow.style.fontWeight = '500';
      marketNameRow.style.marginBottom = '4px';
      marketNameRow.innerHTML = marketName;
      legendElement.appendChild(marketNameRow);
    }

    const symbolName = `${tokenAddress.substring(0, 6)}...${tokenAddress.substring(tokenAddress.length - 4)}`;
    
    const legendRow = document.createElement('div');
    legendRow.innerHTML = `${symbolName} <strong>${startingPrice}</strong>`;
    legendElement.appendChild(legendRow);

    legendRef.current = legendRow;

    // Subscribe to crosshair move
    chart.subscribeCrosshairMove(param => {
      let priceFormatted = '';
      if (param.time) {
        const data = param.seriesData.get(areaSeries);
        if (data) {
          const price = data.value !== undefined ? data.value : data.close;
          priceFormatted = price.toFixed(8);
        }
      }
      legendRow.innerHTML = `${symbolName} <strong>${priceFormatted || currentPrice.toFixed(8)}</strong>`;
    });

    // Fit content initially
    chart.timeScale().fitContent();

    // Responsive chart size
    const resizeObserver = new ResizeObserver(entries => {
      if (entries.length === 0 || entries[0].target !== chartContainerRef.current) return;
      const { width, height } = entries[0].contentRect;
      chart.applyOptions({ width, height: 240 });
      chart.timeScale().fitContent();
    });

    resizeObserver.observe(chartContainerRef.current);

    // Cleanup
    return () => {
      resizeObserver.disconnect();
      chart.remove();
      if (chartContainerRef.current && legendElement.parentNode === chartContainerRef.current) {
        chartContainerRef.current.removeChild(legendElement);
      }
    };
  }, [tokenAddress, marketName]); // Re-create chart if token address or market name changes

  // Process price history and format it for the chart
  useEffect(() => {
    if (!seriesRef.current) return;

    console.log(`📊 Processing price history data, count: ${initialPriceHistory.length}`);
    
    // Format price history for the chart
    let chartData = [];
    if (initialPriceHistory && initialPriceHistory.length > 0) {
      chartData = initialPriceHistory.map(item => ({
        time: new Date(item.timestamp).getTime() / 1000,
        value: parseFloat(item.price)
      }));
      console.log(`📈 Formatted ${chartData.length} price history points`);
    }

    // If we have starting price but no history, add starting price
    if ((chartData.length === 0 || initialPriceHistory.length === 0) && startingPrice) {
      console.log(`⚠️ No price history found, using starting price: ${startingPrice}`);
      const startTime = new Date(marketStartTime).getTime() / 1000;
      chartData.push({
        time: startTime,
        value: parseFloat(startingPrice)
      });
    }

    // Sort by time
    chartData.sort((a, b) => a.time - b.time);
    
    console.log(`🔄 Setting chart data with ${chartData.length} points`);
    console.log(`📊 First point: ${JSON.stringify(chartData[0])}`);
    console.log(`📊 Last point: ${JSON.stringify(chartData[chartData.length - 1])}`);
    
    // Set series data
    seriesRef.current.setData(chartData);
    setPriceData(chartData);

    // Update current price
    if (chartData.length > 0) {
      setCurrentPrice(chartData[chartData.length - 1].value);
      if (legendRef.current) {
        const symbolName = `${tokenAddress.substring(0, 6)}...${tokenAddress.substring(tokenAddress.length - 4)}`;
        legendRef.current.innerHTML = `${symbolName} <strong>${chartData[chartData.length - 1].value.toFixed(8)}</strong>`;
      }
    }

    // Fit content to show all data
    if (chartRef.current) {
      chartRef.current.timeScale().fitContent();
    }
  }, [initialPriceHistory, marketStartTime, startingPrice, tokenAddress]);

  // Subscribe to real-time price updates
  useEffect(() => {
    if (!tokenAddress || !seriesRef.current) return;

    console.log(`📈 Setting up price updates subscription for token: ${tokenAddress}`);
    
    // Subscribe to price updates for this specific token
    const priceChannel = supabase
      .channel('realtime_prices')
      .on('broadcast', { event: 'price_update' }, (payload) => {
        console.log(`📊 Received price update:`, payload.payload);
        
        // Check if this update is for our token
        if (payload.payload.token_address === tokenAddress) {
          const newPrice = parseFloat(payload.payload.current_price);
          const currentTime = new Date(payload.payload.updated_at).getTime() / 1000;
          
          console.log(`🔄 Updating chart with new price: ${newPrice} at time: ${new Date(currentTime * 1000).toLocaleTimeString()}`);
          
          if (onPriceUpdate) {
            onPriceUpdate({
              price: newPrice,
              liquidity: payload.payload.liquidity,
              timestamp: payload.payload.updated_at
            }); 
          }
          // Add new price point
          const newPoint = { time: currentTime, value: newPrice };
          
          try {
            // Update series with the new point
            seriesRef.current.update(newPoint);
            console.log(`✅ Chart updated successfully`);
            
            // Update current price display
            setCurrentPrice(newPrice);
            
            // Update legend with new price
            if (legendRef.current) {
              const symbolName = `${tokenAddress.substring(0, 6)}...${tokenAddress.substring(tokenAddress.length - 4)}`;
              legendRef.current.innerHTML = `${symbolName} <strong>${newPrice.toFixed(8)}</strong>`;
            }
            
            // Update price data state
            setPriceData(prevData => [...prevData, newPoint]);
          } catch (error) {
            console.error(`❌ Error updating chart:`, error);
          }
        } else {
            console.log(`Token address is different.`)
        }
      })
      .subscribe();

    // Cleanup subscription when component unmounts
    return () => {
      supabase.removeChannel(priceChannel);
    };
  }, [tokenAddress, onPriceUpdate]);

  return (
    <div className="relative bg-gray-800 rounded-md p-4 h-60">
      <div 
        ref={chartContainerRef} 
        className="w-full h-full"
        style={{ position: 'relative' }}
      />
    </div>
  );
};

export default MarketChart;