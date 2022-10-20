# Example script that bins data with a timestamp to a set of tiles
from unicodedata import digit
import numpy as np
import pandas as pd
from higlass import Tileset
import time
from datetime import datetime

# Preprocess data
test_data = pd.read_csv(filepath_or_buffer='fvz2.csv', sep=';', low_memory=False)
test_data = test_data[['zeitstempel', 'vorstemp', 'rts_tau', 'rus_tauk', 'rus_taus', 'laenge_bbwz', 'beizgeschwindigkeit']]
test_data.dropna(inplace=True)
test_data['zeitstempel'] = test_data['zeitstempel'].transform(lambda x: datetime.fromisoformat(x).timestamp() * 1000.0)
test_data.rename(columns={'zeitstempel': 'timestamp', 'vorstemp': 'value'}, inplace=True)

print(test_data.head())
print(test_data.columns)

header = list(test_data.columns)

year_resolution = 60 * 60 * 24 * 365 * 1000


maximums = {}
minimums = {}
for column in header:
    maximums[column] = test_data[column].max()
    minimums[column] = test_data[column].min()

memory_tiles = {
}


df = test_data

# sort data by timestamp
df.sort_values(by=['timestamp'], inplace=True)

lower_bound = datetime.fromtimestamp(df['timestamp'].min() / 1000.0)
upper_bound = datetime.fromtimestamp(df['timestamp'].max() / 1000.0)

lower_bound = lower_bound.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
upper_bound = upper_bound.replace(year=upper_bound.year + 1, month=1, day=1, hour=0, minute=0, second=0, microsecond=0)

print(lower_bound)
print(upper_bound)



numpyTimestamps = df['timestamp'].to_numpy()


numpyFullFrame = df.to_numpy()






def aggregationSamples(timestamps, fullFrame, start, end, n_bins):
    samples = []

    bins = np.linspace(start, end, n_bins + 1)
    digitized = np.digitize(timestamps, bins) - 1

    time_step = (end - start) / n_bins

    for i in range(0, n_bins):
        bin_data: np.ndarray = fullFrame[digitized == i]
        sample = {}
        if len(bin_data) > 30:
            means = bin_data.mean(axis=0)
            max = bin_data.max(axis=0)
            min = bin_data.min(axis=0)
            quantiles = np.quantile(bin_data, [0.0, 0.25, 0.5, 0.75, 1.0], axis=0)

            for j in range(0, len(header)):
                sample['max'] = {}
                sample['min'] = {}
                sample['quantile'] = {}
                sample['mean'] = {}
                

            for j in range(0, len(header)):
                sample['mean'][header[j]] = means[j]
                sample['max'][header[j]] = max[j]
                sample['min'][header[j]] = min[j]
                sample['quantile'][header[j]] = list(quantiles[:, j])
        else:
            sample['individuals'] = {
                'header': header,
                'sparse': bin_data.tolist()
            }
            if (len(bin_data.tolist()) > 0):
                print(bin_data[:, 0].tolist())
                print('\n')

        sample['start'] = start + time_step * i
        sample['end'] = start + time_step * (i + 1)
        samples += [sample]

    return samples


z = 0
for n_bins in [upper_bound.year - lower_bound.year, (upper_bound.year - lower_bound.year) * 30,
    (upper_bound.year - lower_bound.year) * 365, (upper_bound.year - lower_bound.year) * 1000,
    (upper_bound.year - lower_bound.year) * 10000]:
    bins = np.linspace(datetime.timestamp(lower_bound) * 1000.0, datetime.timestamp(upper_bound) * 1000.0, n_bins + 1)
    digitized = np.digitize(numpyTimestamps, bins) - 1
    time_step = ((datetime.timestamp(upper_bound) * 1000) - (datetime.timestamp(lower_bound) * 1000)) / n_bins


    for i in range(0, n_bins):
        # for each year... 
        bin_data = numpyFullFrame[digitized == i]
        binTimestamps = numpyTimestamps[digitized == i]

        start = (datetime.timestamp(lower_bound) * 1000) + time_step * i
        end = (datetime.timestamp(lower_bound) * 1000) + time_step * (i + 1)

        subsamples = aggregationSamples(binTimestamps, bin_data, start, end, 12)

        memory_tiles[f'{z}.{i}.{0}'] = {
            'samples': subsamples,
            'bounds': maximums,
            'start': start,
            'end': end
        }

    z = z + 1




def dftimeseries(**kwargs):
    min = datetime.timestamp(lower_bound) * 1000
    max = datetime.timestamp(upper_bound) * 1000

    tsinfo = {
        'tile_size': 256,
        'min_pos': [min, min],
        'max_pos': [max, max],
        'max_zoom': 5,
        'resolutions': [year_resolution, year_resolution / 30, year_resolution / 365, year_resolution / 1000, year_resolution / 10000]
    }
    
    def tileset_info():
        return tsinfo
            
    def _get_tile(z, x, y):
        if f'{z}.{x}.{0}' in memory_tiles:
            return memory_tiles[f'{z}.{x}.{0}']
        else:
            return { 'samples': [], 'bounds': maximums, 'start': 0, 'end': 0 }
    
    def tiles(tile_ids):
        tiles = []
        
        for tile_id in tile_ids:
            # decompose the tile zoom and location
            _, z, x, y = tile_id.split('.')
            
            print('requesting')
            # generate the tile
            data = _get_tile(int(z), int(x), int(y))

            # format the tile response
            tiles.append((tile_id, { 'samples': data['samples'], 'bounds': data['bounds'], 'start': data['start'], 'end': data['end'] }))

        return tiles

    return Tileset(
        tileset_info=tileset_info,
        tiles=tiles,
        **kwargs
    )