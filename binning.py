# Example script that bins data with a timestamp to a set of tiles
import numpy as np
import pandas as pd
from higlass import Tileset
import time
from datetime import datetime
from numpy.random import default_rng

year_resolution = 60 * 60 * 24 * 365 * 1000

rng = default_rng()



memory_tiles = {
}


length = 1000000

# create dataframe of test data
df = pd.DataFrame({
    'timestamp': np.floor((np.random.random((length,)) * 31556952000 * 4) + 1663157371591),
    'value': np.random.random((length,)),

})

# sort data by timestamp
df.sort_values(by=['timestamp'], inplace=True)

print('hello')
print(df['timestamp'].max() / 1000)
print(time.time())

lower_bound = datetime.fromtimestamp(df['timestamp'].min() / 1000)
upper_bound = datetime.fromtimestamp(df['timestamp'].max() / 1000)

lower_bound = lower_bound.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
upper_bound = upper_bound.replace(year=upper_bound.year + 1, month=1, day=1, hour=0, minute=0, second=0, microsecond=0)

print(lower_bound)
print(upper_bound)

n_bins = upper_bound.year - lower_bound.year

data = df['timestamp'].to_numpy()
year_bins = np.linspace(datetime.timestamp(lower_bound) * 1000, datetime.timestamp(upper_bound) * 1000, n_bins + 1)
digitized = np.digitize(data, year_bins) - 1

print(digitized)

for i in range(0, n_bins):
    bin_data = df.to_numpy()[digitized == i]
    print('bin')
    print(bin_data)
    print(bin_data.mean(axis=0)[1])

    choices = rng.choice(len(bin_data), size=min(len(bin_data), 30), replace=False)
    subsamples = bin_data[choices]
    #print(subsamples)

    memory_tiles[f'0.{i}.{0}'] = {
        'samples': subsamples
    }



n_bins = (upper_bound.year - lower_bound.year) * 100
week_bins = np.linspace(datetime.timestamp(lower_bound) * 1000, datetime.timestamp(upper_bound) * 1000, n_bins + 1)
digitized = np.digitize(data, week_bins) - 1

for i in range(0, n_bins):
    bin_data = df.to_numpy()[digitized == i]

    choices = rng.choice(len(bin_data), size=min(len(bin_data), 30), replace=False)
    subsamples = bin_data[choices]
    #print(subsamples)

    memory_tiles[f'1.{i}.{0}'] = {
        'samples': subsamples
    }



n_bins = (upper_bound.year - lower_bound.year) * 365
day_bins = np.linspace(datetime.timestamp(lower_bound) * 1000, datetime.timestamp(upper_bound) * 1000, n_bins + 1)
digitized = np.digitize(data, day_bins) - 1

for i in range(0, n_bins):
    bin_data = df.to_numpy()[digitized == i]

    choices = rng.choice(len(bin_data), size=min(len(bin_data), 30), replace=False)
    subsamples = bin_data[choices]
    #print(subsamples)

    memory_tiles[f'2.{i}.{0}'] = {
        'samples': subsamples
    }


def dftimeseries(**kwargs):
    min = datetime.timestamp(lower_bound) * 1000
    max = datetime.timestamp(upper_bound) * 1000

    tsinfo = {
        'tile_size': 256,
        'min_pos': [min, min],
        'max_pos': [max, max],
        'max_zoom': 5,
        'resolutions': [year_resolution, year_resolution / 100, year_resolution / 365]
    }
    
    def tileset_info():
        return tsinfo
            
    def _get_tile(z, x, y):
        if f'{z}.{x}.{0}' in memory_tiles:
            return memory_tiles[f'{z}.{x}.{0}']
        else:
            return { 'samples': np.array([]) }
    
    def tiles(tile_ids):
        tiles = []
        
        for tile_id in tile_ids:
            # decompose the tile zoom and location
            _, z, x, y = tile_id.split('.')
            
            print('requesting')
            # generate the tile
            data = _get_tile(int(z), int(x), int(y))
 
            # format the tile response
            tiles.append((tile_id, { 'samples': data['samples'].tolist() }))

        return tiles

    return Tileset(
        tileset_info=tileset_info,
        tiles=tiles,
        **kwargs
    )